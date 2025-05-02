<script setup lang="ts">
import {
  useAvailableDataStore,
  type CropmaskResultItem,
} from '../stores/availableDataStore'
import { useProductStore } from '../stores/productStore'
import { useMapStore } from '../stores/mapStore'
import SelectMenu from './SelectMenu.vue'
import { watch, ref, computed, Ref } from 'vue'
import { useDraggableResizable } from '../composables/useDraggableResizable'

// Initialize stores
const availableDataStore = useAvailableDataStore()
const productStore = useProductStore()
const mapStore = useMapStore()

// Draggable and Resizable Composable
const controlPanelRef = ref<HTMLElement | null>(null)

// Initial dimensions - keep these consistent
const initialWidth = 384
const initialHeight = 480 // Or your preferred initial height

const { position, dimensions, startDrag, startResize } = useDraggableResizable(
  controlPanelRef,
  {
    x: window.innerWidth - initialWidth - 10, // Consistent 10px buffer from the right edge
    y: window.innerHeight - initialHeight - 10, // Consistent 10px buffer from the bottom edge
  },
  { width: initialWidth, height: initialHeight },
)

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
  { id: 'streets', name: 'Mapbox Streets' },
  { id: 'outdoors', name: 'Mapbox Outdoors' },
  { id: 'light', name: 'Mapbox Light' },
  { id: 'dark', name: 'Mapbox Dark' },
  { id: 'satellite', name: 'Mapbox Satellite' },
  { id: 'satellite-streets', name: 'Mapbox Satellite Streets' },
  { id: 'navigation-day', name: 'Mapbox Navigation Day' },
  { id: 'navigation-night', name: 'Mapbox Navigation Night' },
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

// Watch for product_id changes
watch(
  () => productStore.getSelectedProduct.product_id,
  () => {
    /* placeholder for product-specific logic */
  },
)

// Watch for basemap changes
watch(
  () => mapStore.selectedBasemap,
  (newBasemap?: string) => {
    if (newBasemap) {
      // No need to manually update dropdown with PrimeVue's two-way binding
    }
  },
  { immediate: true },
)

const handleProductSelectionEvent = (value: unknown) => {
  if (typeof value === 'string' && value) {
    productStore.setProduct(value)
  }
}

const handleCropmaskSelectionEvent = (value: unknown) => {
  if (typeof value === 'string') {
    // Allow empty string for "no cropmask"
    productStore.setCropmask(value)
  } else if (value === null || value === undefined) {
    productStore.setCropmask('') // Explicitly set to empty string
  }
}

const handleBasemapSelectionEvent = (value: unknown) => {
  if (typeof value === 'string' && value) {
    mapStore.setBasemap(value)
  }
}

// Date handling logic
const handleDateSelection = async (dateFromPicker: Date | null): Promise<void> => {
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

const dateFormat = "yy-mm-dd" // PrimeVue Calendar format string - note: 'yy' is 4-digit year in PrimeVue

// Date navigation computed properties and functions
const availableDates = computed<string[]>(() => productStore.getProductDates || [])
const currentDateStr = computed<string | undefined>(() => productStore.getSelectedProduct.date)
const currentIndex = computed<number>(() => {
  if (!currentDateStr.value || !availableDates.value || availableDates.value.length === 0) {
    return -1
  }
  const normalizedCurrentDate = currentDateStr.value.replace(/-/g, '/')
  return availableDates.value.findIndex((d) => d.replace(/-/g, '/') === normalizedCurrentDate)
})
const canGoPrevious = computed<boolean>(() => currentIndex.value > 0)
const canGoNext = computed<boolean>(() => 
  currentIndex.value !== -1 && currentIndex.value < availableDates.value.length - 1
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

/**
 * Filter function for PCalendar to only allow dates available in the product
 */
const isDateSelectable = (date: Date) => {
  const formattedDate = new Date(date).toLocaleDateString('en-CA') // Format as YYYY-MM-DD
  return allowedDatesForPicker.value.includes(formattedDate.replace(/-/g, '/'))
}

// Computed properties for select components
const productsForSelect = computed<Array<Record<string, unknown>>>(() => {
  return availableDataStore.getProducts || []
})

const cropmasksForSelect = computed<CropmaskResultItem[]>(() => {
  return availableDataStore.getCropmasks || []
})

const allowedDatesForPicker = computed<string[]>(() => {
  return (productStore.getProductDates || []).map((dateStr) => dateStr.replace(/-/g, '/'))
})
</script>

<template>
  <div
    ref="controlPanelRef"
    class="control-panel-widget widget-dark-theme"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      width: dimensions.width + 'px',
      height: dimensions.height + 'px',
    }"
  >
    <div class="control-panel-header" @mousedown="startDrag">
      <h2>Map Controls</h2>
    </div>
    <div class="resize-handle resize-handle-br" @mousedown="startResize"></div>
    
    <div class="control-panel-body">
      <!-- Product Selection Section -->
      <div class="control-section">
        <p class="section-title">Product</p>
        <SelectMenu
          :model-value="productStore.getSelectedProduct.product_id"
          :data="productsForSelect"
          key-by="product_id"
          label-by="display_name"
          placeholder="Select Product"
          @update:model-value="handleProductSelectionEvent"
        />
      </div>
      
      <!-- Date Selection Section -->
      <div class="control-section">
        <p class="section-title">Date</p>
        <div class="date-controls">
          <PButton
            icon="pi pi-chevron-left"
            class="p-button-rounded p-button-secondary"
            :disabled="!canGoPrevious"
            aria-label="Previous Date"
            @click="goToPreviousDate"
          />
          <PCalendar
            v-model="selectedDate"
            :dateFormat="dateFormat"
            :showButtonBar="true"
            :showIcon="true"
            :selectionMode="'single'"
            placeholder="Select Date"
            class="w-full"
            @change="handleDateSelection"
          />
          <PButton
            icon="pi pi-chevron-right"
            class="p-button-rounded p-button-secondary"
            :disabled="!canGoNext"
            aria-label="Next Date"
            @click="goToNextDate"
          />
        </div>
      </div>
      
      <!-- Cropmask Selection Section -->
      <div class="control-section">
        <p class="section-title">Cropmask</p>
        <SelectMenu
          :model-value="productStore.getSelectedProduct.cropmask_id"
          :data="cropmasksForSelect"
          key-by="cropmask_id"
          label-by="display_name"
          placeholder="Select Cropmask (Optional)"
          @update:model-value="handleCropmaskSelectionEvent"
        />
      </div>
      
      <!-- Basemap Selection Section -->
      <div class="control-section">
        <p class="section-title">Basemap</p>
        <SelectMenu
          :model-value="mapStore.selectedBasemap"
          :data="availableBasemaps"
          key-by="id"
          label-by="name"
          placeholder="Select Basemap"
          data-basemap-selector="true"
          @update:model-value="handleBasemapSelectionEvent"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styling to match the Agribot chat widget */
.control-panel-widget {
  border: 1px solid #ccc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background: #231f1fc8;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: fixed;
  z-index: 1000;
  color: white;
}

.control-panel-header {
  background: #368535;
  color: white;
  padding: 10px;
  text-align: center;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  position: relative;
  cursor: move;
  user-select: none;
}

.control-panel-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
  font-family: var(--font-family);
}

.control-panel-body {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.date-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.resize-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  z-index: 1001;
}

.resize-handle-br:after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 12px;
  height: 12px;
  border-right: 2px solid rgba(255, 255, 255, 0.5);
  border-bottom: 2px solid rgba(255, 255, 255, 0.5);
}

/* Calendar styling */
:deep(.p-calendar) {
  width: 100%;
}

:deep(.p-calendar .p-inputtext) {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(.p-calendar .p-inputtext::placeholder) {
  color: rgba(255, 255, 255, 0.5);
}

:deep(.p-calendar .p-inputtext:focus) {
  box-shadow: 0 0 0 1px #368535;
  border-color: #368535;
}

/* Datepicker styling */
:deep(.p-datepicker) {
  background-color: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

:deep(.p-datepicker .p-datepicker-header) {
  background-color: #2d2d2d;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.p-datepicker .p-datepicker-header .p-datepicker-title) {
  color: white;
}

:deep(.p-datepicker .p-datepicker-header .p-datepicker-prev),
:deep(.p-datepicker .p-datepicker-header .p-datepicker-next) {
  color: white;
}

:deep(.p-datepicker table th) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.p-datepicker table td > span) {
  color: white;
}

:deep(.p-datepicker table td > span.p-highlight) {
  background-color: #368535;
  color: white;
}

:deep(.p-datepicker table td > span:not(.p-highlight):not(.p-disabled):hover) {
  background-color: rgba(54, 133, 53, 0.2);
}

:deep(.p-datepicker .p-datepicker-buttonbar) {
  background-color: #2d2d2d;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.p-datepicker .p-datepicker-buttonbar .p-button) {
  background-color: #368535;
  border-color: #368535;
  color: white;
}

:deep(.p-datepicker .p-datepicker-buttonbar .p-button:hover) {
  background-color: #297029;
  border-color: #297029;
}

/* Button styling */
:deep(.p-button.p-button-secondary) {
  background-color: #368535;
  border-color: #368535;
  color: white;
}

:deep(.p-button.p-button-secondary:enabled:hover) {
  background-color: #297029;
  border-color: #297029;
}

:deep(.p-button.p-button-secondary:disabled) {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
  opacity: 0.6;
}
</style>
