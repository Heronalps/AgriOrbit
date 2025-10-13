<script setup lang="ts">
import {
  useAvailableDataStore,
  type CropmaskResultItem,
} from '../stores/availableDataStore'
import { useProductStore } from '../stores/productStore'
import { useMapStore } from '../stores/mapStore'
import { watch, ref, computed, Ref } from 'vue'
import { useDraggable } from '../composables/useDraggable'
import PDropdown from 'primevue/dropdown'
import PPanel from 'primevue/panel'
import PButton from 'primevue/button'
import PCalendar from 'primevue/calendar'

// Initialize stores
const availableDataStore = useAvailableDataStore()
const productStore = useProductStore()
const mapStore = useMapStore()

// Draggable and Resizable Composable
const controlPanelRef = ref<HTMLElement | null>(null)

// Initial dimensions - keep these consistent
const initialWidth = 350
const initialHeight = 480

const { position, dimensions, startDrag } = useDraggable(
  controlPanelRef,
  {
    x: window.innerWidth - initialWidth - 10, // Positioned to the right by default
    y: window.innerHeight - initialHeight - 10, // Consistent 10px buffer from the bottom edge
  },
  { width: initialWidth, height: initialHeight },
)

// Computed style for PPanel positioning and dimensions
const panelStyle = computed(() => ({
  left: position.value.x + 'px',
  top: position.value.y + 'px',
  width: dimensions.value.width + 'px',
  height: dimensions.value.height + 'px',
  position: 'fixed',
  overflow: 'hidden',
  display: 'flex', // Added from ChatWidget.vue
  flexDirection: 'column', // Added from ChatWidget.vue
  zIndex: 1040, // Added zIndex, slightly different from ChatWidget's 1050
  willChange: 'transform', // Hint for drag optimization
  backfaceVisibility: 'hidden', // May improve rendering during transforms
}))

const panelControlPt = computed(() => ({
  header: {
    onmousedown: startDrag,
    style: 'cursor: move; width: 100%; user-select: none; flex-shrink: 0;',
  },
  toggleablecontent: {
    style:
      'flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column;',
  },
  content: {
    style:
      'display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden; padding: 0; height: 100%;',
  },
}))

const calendarPt = computed(() => ({
  input: {
    class: 'custom-grey-input-text',
  },
  panel: {
    class: 'custom-grey-panel',
  },
}))

/**
 * Represents an item in the basemap selection dropdown.
 */
interface BasemapOption {
  id: string
  name: string
  [key: string]: unknown // Index signature for SelectMenu compatibility
}

/**
 * Local reactive state for the calendar's v-model.
 */
const selectedDate: Ref<Date | null> = ref<Date | null>(null)

/**
 * Available basemap options for the SelectMenu.
 */
const availableBasemaps: Ref<BasemapOption[]> = ref<BasemapOption[]>([
  { id: 'satellite', name: 'Mapbox Satellite' },
  { id: 'dark', name: 'Mapbox Dark' },
  { id: 'light', name: 'Mapbox Light' },
])

// Watch for date changes in the store and sync with local state
watch(
  () => productStore.getSelectedProduct.date,
  (newStoreDate?: string) => {
    if (newStoreDate) {
      const newDateObj = new Date(newStoreDate.replace(/-/g, '/'))
      if (
        !selectedDate.value ||
        selectedDate.value.getTime() !== newDateObj.getTime()
      ) {
        selectedDate.value = newDateObj
      }
    } else {
      if (selectedDate.value !== null) {
        selectedDate.value = null
      }
    }
  },
  { immediate: true },
)

const handleProductSelectionEvent = (event: {
  originalEvent: Event
  value: unknown
}) => {
  const value = event.value
  if (typeof value === 'string' && value) {
    productStore.setProduct(value)
  }
}

const handleCropmaskSelectionEvent = (event: {
  originalEvent: Event
  value: unknown
}) => {
  const value = event.value
  if (typeof value === 'string') {
    // Allow empty string for "no cropmask"
    productStore.setCropmask(value)
  } else if (value === null || value === undefined) {
    productStore.setCropmask('') // Explicitly set to empty string
  }
}

const handleBasemapSelectionEvent = (event: {
  originalEvent: Event
  value: unknown
}) => {
  const value = event.value
  if (typeof value === 'string' && value) {
    mapStore.setBasemap(value)
  }
}

// Date handling logic
const handleDateSelection = async (
  dateValue: string | Date | string[] | Date[] | undefined | null,
): Promise<void> => {
  let dateFromPicker: Date | null = null

  if (dateValue instanceof Date) {
    dateFromPicker = dateValue
  } else if (typeof dateValue === 'string') {
    // Attempt to parse if it's a string (e.g., if manual input is allowed and returns string)
    const parsedDate = new Date(dateValue.replace(/-/g, '/'))
    if (!isNaN(parsedDate.getTime())) {
      dateFromPicker = parsedDate
    }
  } // Array types (string[] | Date[]) are not typical for single date picker, handle if necessary

  if (dateFromPicker instanceof Date && !isNaN(dateFromPicker.getTime())) {
    const day = dateFromPicker.getDate().toString().padStart(2, '0')
    const month = (dateFromPicker.getMonth() + 1).toString().padStart(2, '0')
    const year = dateFromPicker.getFullYear()
    const storeDateString = `${year}/${month}/${day}`
    await productStore.setDate(storeDateString)
  } else if (dateFromPicker === null) {
    await productStore.setDate(undefined)
  } else {
    console.warn(
      '[ControlPanel.vue EVENT @change]: Received invalid date or unexpected value from calendar:',
      dateFromPicker,
    )
  }
}

const dateFormat = 'yy-mm-dd' // PrimeVue Calendar format string - note: 'yy' is 4-digit year in PrimeVue

// Date navigation computed properties and functions
const availableDates = computed<string[]>(
  () => productStore.getProductDates || [],
)
const currentDateStr = computed<string | undefined>(
  () => productStore.getSelectedProduct.date,
)
const currentIndex = computed<number>(() => {
  if (
    !currentDateStr.value ||
    !availableDates.value ||
    availableDates.value.length === 0
  ) {
    return -1
  }
  const normalizedCurrentDate = currentDateStr.value.replace(/-/g, '/')
  return availableDates.value.findIndex(
    (d) => d.replace(/-/g, '/') === normalizedCurrentDate,
  )
})
const canGoPrevious = computed<boolean>(() => currentIndex.value > 0)
const canGoNext = computed<boolean>(
  () =>
    currentIndex.value !== -1 &&
    currentIndex.value < availableDates.value.length - 1,
)

const goToPreviousDate = async (): Promise<void> => {
  if (canGoPrevious.value) {
    const prevDate = availableDates.value[currentIndex.value - 1]
    if (prevDate) {
      await productStore.setDate(prevDate.replace(/-/g, '/'))
    }
  }
}

const goToNextDate = async (): Promise<void> => {
  if (canGoNext.value) {
    const nextDate = availableDates.value[currentIndex.value + 1]
    if (nextDate) {
      await productStore.setDate(nextDate.replace(/-/g, '/'))
    }
  }
}

// Computed properties for select components
const productsForSelect = computed<Array<Record<string, unknown>>>(() => {
  return availableDataStore.getProducts || []
})

const cropmasksForSelect = computed<CropmaskResultItem[]>(() => {
  return availableDataStore.getCropmasks || []
})

const selectedProductForDropdown = ref<string | undefined>(
  productStore.getSelectedProduct.product_id,
)
const selectedCropmaskForDropdown = ref<string | undefined>(
  typeof productStore.getSelectedProduct.cropmask === 'string'
    ? productStore.getSelectedProduct.cropmask
    : undefined,
)
const selectedBasemapForDropdown = ref<string | undefined>(
  mapStore.selectedBasemap,
)

watch(
  () => productStore.getSelectedProduct.product_id,
  (newId) => {
    selectedProductForDropdown.value = newId
  },
)

watch(
  () => productStore.getSelectedProduct.cropmask,
  (newCropmask) => {
    selectedCropmaskForDropdown.value =
      typeof newCropmask === 'string' ? newCropmask : undefined
  },
)

watch(
  () => mapStore.selectedBasemap,
  (newBasemap) => {
    selectedBasemapForDropdown.value = newBasemap
  },
)
</script>

<template>
  <PPanel
    ref="controlPanelRef"
    header="Map Controls"
    class="widget-dark-theme"
    :style="panelStyle"
    :pt="panelControlPt"
    :toggleable="false"
    :resizable="false"
  >
    <div class="control-panel-content-wrapper">
      <!-- Product Selection -->
      <div class="control-section">
        <label for="product-select">Product:</label>
        <PDropdown
          id="product-select"
          v-model="selectedProductForDropdown"
          :options="productsForSelect"
          optionLabel="display_name"
          optionValue="product_id"
          placeholder="Select a Product"
          class="w-full"
          @change="handleProductSelectionEvent"
        />
      </div>

      <!-- Date Selection -->
      <div class="control-section">
        <label for="date-select">Date</label>
        <div class="date-navigation">
          <PButton
            icon="pi pi-chevron-left"
            class="p-button-custom-grey p-button-sm"
            :disabled="!canGoPrevious"
            aria-label="Previous Date"
            @click="goToPreviousDate"
          />
          <PCalendar
            id="date-select"
            v-model="selectedDate"
            :date-format="dateFormat"
            placeholder="Select a Date"
            class="w-full"
            :show-icon="false"
            :pt="calendarPt"
            @update:model-value="handleDateSelection"
          />
          <PButton
            icon="pi pi-chevron-right"
            class="p-button-custom-grey p-button-sm"
            :disabled="!canGoNext"
            aria-label="Next Date"
            @click="goToNextDate"
          />
        </div>
      </div>

      <!-- Cropmask Selection -->
      <div class="control-section">
        <label for="cropmask-select">Crop Mask:</label>
        <PDropdown
          id="cropmask-select"
          v-model="selectedCropmaskForDropdown"
          :options="cropmasksForSelect"
          optionLabel="display_name"
          optionValue="cropmask_id"
          placeholder="Select Crop Mask"
          class="w-full"
          showClear
          @change="handleCropmaskSelectionEvent"
        />
      </div>

      <!-- Basemap Selection -->
      <div class="control-section">
        <label for="basemap-select">Basemap:</label>
        <PDropdown
          id="basemap-select"
          v-model="selectedBasemapForDropdown"
          :options="availableBasemaps"
          optionLabel="name"
          optionValue="id"
          placeholder="Select Basemap"
          class="w-full custom-grey-input-text"
          :pt="{ panel: { class: 'custom-grey-panel' } }"
          @change="handleBasemapSelectionEvent"
        />
      </div>
    </div>
  </PPanel>
</template>

<style scoped>
.control-panel-content-wrapper {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
