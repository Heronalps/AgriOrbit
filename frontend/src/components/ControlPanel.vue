// Component responsible for rendering the control panel, which includes //
selections for product, date, cropmask, and basemap.
<script setup lang="ts">
import { useAvailableDataStore } from '@/stores/availableDataStore'
import { useProductStore } from '@/stores/productStore'
import { useMapStore } from '@/stores/mapStore'
import SelectMenu from './SelectMenu.vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { watch, ref, computed } from 'vue'

// Initialize stores
const availableDataStore = useAvailableDataStore()
const productStore = useProductStore()
const mapStore = useMapStore()

// Local state for the datepicker's v-model
const selectedDate = ref<Date | null>(null)

// Available basemap options for the SelectMenu
const availableBasemaps = ref([
  { id: 'streets', name: 'Mapbox Streets' },
  { id: 'outdoors', name: 'Mapbox Outdoors' },
  { id: 'light', name: 'Mapbox Light' },
  { id: 'dark', name: 'Mapbox Dark' },
  { id: 'satellite', name: 'Mapbox Satellite' },
  { id: 'satellite-streets', name: 'Mapbox Satellite Streets' },
  { id: 'navigation-day', name: 'Mapbox Navigation Day' },
  { id: 'navigation-night', name: 'Mapbox Navigation Night' },
])

// Watcher to synchronize the local `selectedDate` (for the datepicker)
// with the date in the `productStore`.
watch(
  () => productStore.getSelectedProduct.date,
  (newStoreDate) => {
    if (newStoreDate) {
      // Dates from store are expected in 'YYYY/MM/DD' format.
      // The Date constructor handles this format correctly.
      const newDateObj = new Date(newStoreDate)
      // Update local `selectedDate` only if it's different, to avoid infinite loops
      // or unnecessary re-renders if the datepicker itself triggered the store update.
      if (
        !selectedDate.value ||
        selectedDate.value.getTime() !== newDateObj.getTime()
      ) {
        selectedDate.value = newDateObj
      }
    } else {
      // If the store date is cleared, clear the local datepicker value.
      if (selectedDate.value !== null) {
        selectedDate.value = null
      }
    }
  },
  { immediate: true } // Ensures synchronization when the component is loaded.
)

// Watcher for product ID changes.
// Currently, this watcher doesn't perform any actions itself. The date synchronization
// is handled by the watcher above, as `productStore.setProduct` updates the date in the store.
watch(
  () => productStore.getSelectedProduct.product_id,
  () => {
    // The date watcher above will handle updating selectedDate when the store's date changes
    // as a result of the product change.
  }
)

// Watcher to synchronize the basemap dropdown with the `mapStore`.
// This ensures that if the basemap is changed programmatically elsewhere,
// the dropdown reflects the current state.
watch(
  () => mapStore.selectedBasemap,
  (newBasemap) => {
    if (newBasemap) {
      // Attempt to find the select element and update its value.
      // Using a data attribute `data-basemap-selector` for a more robust selection.
      const dropdown = document.querySelector(
        'select[data-basemap-selector]'
      ) as HTMLSelectElement | null
      if (dropdown && dropdown.value !== newBasemap) {
        dropdown.value = newBasemap
      }
    }
  },
  { immediate: true } // Ensures synchronization on component load.
)

/**
 * Handles the selection of a new product from the product dropdown.
 * @param {Event} selection - The event object from the select element.
 */
const handleProductSelection = async (selection: Event) => {
  const target = selection.target as HTMLSelectElement
  await productStore.setProduct(target.value)
}

/**
 * Handles the selection of a new cropmask from the cropmask dropdown.
 * @param {Event} selection - The event object from the select element.
 */
const handleCropmaskSelection = async (selection: Event) => {
  const target = selection.target as HTMLSelectElement
  const newCropmaskId = target.value
  await productStore.setCropmask(newCropmaskId)
}

/**
 * Handles the selection of a new basemap from the basemap dropdown.
 * @param {Event} selection - The event object from the select element.
 */
const handleBasemapSelection = (selection: Event) => {
  const target = selection.target as HTMLSelectElement
  const newBasemapId = target.value
  mapStore.setBasemap(newBasemapId)
}

/**
 * Handles the date selection event from the Datepicker component.
 * This is typically triggered by the `@update-model-value` event.
 * @param {Date | null} dateFromPicker - The date value from the datepicker.
 */
const handleDateSelection = async (dateFromPicker: Date | null) => {
  if (dateFromPicker instanceof Date && !isNaN(dateFromPicker.getTime())) {
    // Format the date to 'YYYY/MM/DD' string format expected by the store.
    const day = dateFromPicker.getDate().toString().padStart(2, '0')
    const month = (dateFromPicker.getMonth() + 1).toString().padStart(2, '0') // Month is 0-indexed
    const year = dateFromPicker.getFullYear()
    const isoDate = `${year}/${month}/${day}`
    await productStore.setDate(isoDate)
  } else if (dateFromPicker === null) {
    // Handle case where the date is cleared in the datepicker.
    await productStore.setDate(undefined) // Signal to store that date should be cleared or set to default.
  } else {
    // Log a warning if the datepicker emits an unexpected value.
    console.warn(
      '[ControlPanel.vue EVENT @update-model-value]: Received invalid date or unexpected value from datepicker:',
      dateFromPicker
    )
  }
}

/**
 * Handler for the `@date-update` event from the Datepicker.
 * This event might be redundant if `@update-model-value` is already handled,
 * but it's kept here if the Datepicker has specific behavior for this event.
 * @param {Date | null} newDateVal - The new date value.
 */
const onDatepickerDateUpdate = (newDateVal: Date | null) => {
  handleDateSelection(newDateVal)
}

/**
 * Formats a Date object into 'YYYY-MM-DD' string for display or other purposes.
 * Note: The datepicker itself might have its own formatting props.
 * This function is used by the :format prop of the Datepicker.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
const dateFormat = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0') // Month is 0-indexed
  const year = date.getFullYear()
  return `${year}-${month}-${day}` // Standard ISO format for date parts
}

// Computed properties for managing date navigation (Previous/Next buttons)
const availableDates = computed(() => productStore.getProductDates)
const currentDateStr = computed(() => productStore.getSelectedProduct.date)

// Computes the index of the current date within the list of available dates for the selected product.
const currentIndex = computed(() => {
  if (
    !currentDateStr.value ||
    !availableDates.value ||
    availableDates.value.length === 0
  ) {
    return -1 // Indicates no current date or no available dates
  }
  return availableDates.value.findIndex((d) => d === currentDateStr.value)
})

// Determines if the "Previous Date" button should be enabled.
const canGoPrevious = computed(() => {
  return currentIndex.value > 0 // Enabled if not the first date
})

// Determines if the "Next Date" button should be enabled.
const canGoNext = computed(() => {
  return (
    currentIndex.value !== -1 &&
    currentIndex.value < availableDates.value.length - 1
  ) // Enabled if not the last date
})

/**
 * Navigates to the previous available date for the current product.
 */
const goToPreviousDate = async () => {
  if (canGoPrevious.value) {
    const prevDate = availableDates.value[currentIndex.value - 1]
    await productStore.setDate(prevDate)
  }
}

/**
 * Navigates to the next available date for the current product.
 */
const goToNextDate = async () => {
  if (canGoNext.value) {
    const nextDate = availableDates.value[currentIndex.value + 1]
    await productStore.setDate(nextDate)
  }
}
</script>

<template>
  <!-- Main container for the control panel -->
  <div
    class="
      max-w-lg
      bg-[#231f1fc8]
      rounded-md
      shadow-dark-500
      md:w-96
      w-full
      h-auto
    "
  >
    <!-- Inner container with padding and spacing for elements -->
    <div class="flex flex-col w-full h-full p-3 md:p-7 md:space-y-3 space-y-2">
      <!-- Product Selection Section -->
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Product</p>
        <SelectMenu
          v-model="productStore.selectedProduct.product_id"
          :data="availableDataStore.getProducts"
          key-by="product_id"
          label-by="display_name"
          placeholder="Select Product"
          @change="handleProductSelection"
        />
      </div>
      <!-- Date Selection Section -->
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Date</p>
        <div class="flex items-center space-x-2 w-full">
          <!-- Previous Date Button -->
          <button
            :disabled="!canGoPrevious"
            class="
              px-3
              py-2
              bg-gray-600
              hover:bg-gray-500
              text-white
              rounded-md
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label="Previous Date"
            @click="goToPreviousDate"
          >
            &lt;
          </button>
          <!-- Datepicker Component -->
          <Datepicker
            v-model="selectedDate"
            :enable-time-picker="false"
            :allowed-dates="productStore.getProductDates"
            :format="dateFormat"
            placeholder="Select Date"
            :clearable="true"
            :auto-apply="true"
            class="flex-grow"
            aria-label="Select Date"
            @update-model-value="handleDateSelection"
            @date-update="onDatepickerDateUpdate"
          />
          <!-- Next Date Button -->
          <button
            :disabled="!canGoNext"
            class="
              px-3
              py-2
              bg-gray-600
              hover:bg-gray-500
              text-white
              rounded-md
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label="Next Date"
            @click="goToNextDate"
          >
            &gt;
          </button>
        </div>
      </div>
      <!-- Cropmask Selection Section -->
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Cropmask</p>
        <SelectMenu
          v-model="productStore.selectedProduct.cropmask_id"
          :data="availableDataStore.getCropmasks"
          key-by="cropmask_id"
          label-by="display_name"
          placeholder="Select Cropmask"
          @change="handleCropmaskSelection"
        />
      </div>
      <!-- Basemap Selection Section -->
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Basemap</p>
        <SelectMenu
          v-model="mapStore.selectedBasemap"
          :data="availableBasemaps"
          key-by="id"
          label-by="name"
          placeholder="Select Basemap"
          data-basemap-selector
          @change="handleBasemapSelection"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles for ControlPanel.vue */
/* Ensure datepicker input is legible with dark theme */
:deep(.dp__input) {
  color: #333; /* Or a light color if your datepicker theme supports it */
  background-color: #fff; /* Ensure good contrast */
}

/* Add any other specific styles for the control panel here */
</style>
