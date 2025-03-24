// Component responsible for rendering the control panel, which includes //
selections for product, date, cropmask, and basemap.
<script setup lang="ts">
import { useAvailableDataStore, type CropmaskResultItem } from '@/stores/availableDataStore';
import { useProductStore, Product } from '@/stores/productStore';
import { useMapStore } from '@/stores/mapStore';
import SelectMenu from './SelectMenu.vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { watch, ref, computed, Ref } from 'vue';

// Initialize stores
const availableDataStore = useAvailableDataStore();
const productStore = useProductStore();
const mapStore = useMapStore();

/**
 * Represents an item in the basemap selection dropdown.
 */
interface BasemapOption {
  id: string;
  name: string;
}

/**
 * Local reactive state for the datepicker's v-model.
 * Stores the currently selected date as a Date object or null if no date is selected.
 */
const selectedDate: Ref<Date | null> = ref<Date | null>(null);

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
]);

/**
 * Watcher to synchronize the local `selectedDate` (for the datepicker)
 * with the date in the `productStore`.
 * This ensures the datepicker reflects the store's state, e.g., when a product changes.
 */
watch(
  () => productStore.getSelectedProduct.date,
  (newStoreDate?: string) => {
    if (newStoreDate) {
      // Dates from store are expected in 'YYYY/MM/DD' format.
      const newDateObj = new Date(newStoreDate.replace(/-/g, '/')); // Ensure YYYY/MM/DD for constructor
      if (
        !selectedDate.value ||
        selectedDate.value.getTime() !== newDateObj.getTime()
      ) {
        selectedDate.value = newDateObj;
      }
    } else {
      if (selectedDate.value !== null) {
        selectedDate.value = null;
      }
    }
  },
  { immediate: true }
);

/**
 * Watcher for product ID changes from the productStore.
 * When the selected product ID changes, this watcher currently serves as a placeholder
 * or trigger for other reactive dependencies. The actual date synchronization
 * is handled by the watcher on `productStore.getSelectedProduct.date`.
 */
watch(
  () => productStore.getSelectedProduct.product_id,
  () => { // Removed unused _newProductId parameter
    // This watcher can be used for logic specific to product_id changes if needed.
    // For now, date updates are handled by the dedicated date watcher.
    // console.log('[ControlPanel.vue] Watched product ID changed to:', newProductId);
  }
);

/**
 * Watcher to synchronize the basemap dropdown with the `mapStore`.
 * This ensures that if the basemap is changed programmatically elsewhere (e.g., system theme change),
 * the dropdown in the control panel reflects the current state.
 * Note: This watcher directly manipulates the DOM of the SelectMenu for basemaps.
 * While v-model handles reactivity, this might be a safeguard or for specific scenarios.
 */
watch(
  () => mapStore.selectedBasemap,
  (newBasemap?: string) => {
    if (newBasemap) {
      const dropdown = document.querySelector(
        'select[data-basemap-selector="true"]' // Ensure attribute value is checked if set
      ) as HTMLSelectElement | null;
      if (dropdown && dropdown.value !== newBasemap) {
        dropdown.value = newBasemap;
      }
    }
  },
  { immediate: true }
);

/**
 * Handles the selection of a new product from the product dropdown.
 * Updates the productStore with the newly selected product ID.
 * @param {Event} event - The native change event from the select element.
 */
const handleProductSelection = async (event: Event): Promise<void> => {
  const target = event.target as HTMLSelectElement;
  if (target.value) {
    await productStore.setProduct(target.value);
  }
};

/**
 * Handles the selection of a new cropmask from the cropmask dropdown.
 * Updates the productStore with the newly selected cropmask ID.
 * @param {Event} event - The native change event from the select element.
 */
const handleCropmaskSelection = async (event: Event): Promise<void> => {
  const target = event.target as HTMLSelectElement;
  // Assuming cropmask_id can be an empty string for "no cropmask"
  await productStore.setCropmask(target.value);
};

/**
 * Handles the selection of a new basemap from the basemap dropdown.
 * Updates the mapStore with the newly selected basemap ID.
 * @param {Event} event - The native change event from the select element.
 */
const handleBasemapSelection = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  if (target.value) {
    mapStore.setBasemap(target.value);
  }
};

/**
 * Handles the date selection event from the Datepicker component.
 * This is triggered by the `@update:modelValue` event of the Datepicker.
 * Updates the productStore with the newly selected date, formatted as 'YYYY/MM/DD'.
 * @param {Date | null} dateFromPicker - The date value from the datepicker.
 */
const handleDateSelection = async (dateFromPicker: Date | null): Promise<void> => {
  if (dateFromPicker instanceof Date && !isNaN(dateFromPicker.getTime())) {
    const day = dateFromPicker.getDate().toString().padStart(2, '0');
    const month = (dateFromPicker.getMonth() + 1).toString().padStart(2, '0');
    const year = dateFromPicker.getFullYear();
    const storeDateString = `${year}/${month}/${day}`; // Format for the store
    await productStore.setDate(storeDateString);
  } else if (dateFromPicker === null) {
    await productStore.setDate(undefined); // Clears the date in the store
  } else {
    console.warn(
      '[ControlPanel.vue EVENT @update:modelValue]: Received invalid date or unexpected value from datepicker:',
      dateFromPicker
    );
  }
};

/**
 * Handler for the `@date-update` event from the Datepicker.
 * This event might be redundant if `@update:modelValue` is already comprehensively handled,
 * but it's included to align with the original component's event handling.
 * It calls `handleDateSelection` to process the date update.
 * @param {Date | null} newDateVal - The new date value from the datepicker.
 */
const onDatepickerDateUpdate = (newDateVal: Date | null): void => {
  // This function might be redundant if @update:modelValue covers all cases.
  // Kept for consistency if Datepicker has distinct behavior for @date-update.
  handleDateSelection(newDateVal);
};

/**
 * Formats a Date object into 'YYYY-MM-DD' string for display in the Datepicker.
 * This function is used by the `:format` prop of the Datepicker.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string (e.g., "2023-01-15").
 */
const dateFormat = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`; // Standard ISO-like format for display
};

/**
 * Computed property: Retrieves the list of available dates for the currently selected product.
 * Dates are expected to be strings in 'YYYY/MM/DD' or 'YYYY-MM-DD' format from the store.
 * @returns {string[]} An array of available date strings.
 */
const availableDates = computed<string[]>(() => productStore.getProductDates || []);

/**
 * Computed property: Retrieves the currently selected date string from the productStore.
 * @returns {string | undefined} The current date string (e.g., "2023/01/15") or undefined.
 */
const currentDateStr = computed<string | undefined>(
  () => productStore.getSelectedProduct.date
);

/**
 * Computes the index of the current date within the list of available dates for the selected product.
 * This is used for enabling/disabling Previous/Next date navigation buttons.
 * @returns {number} The index of the current date, or -1 if not found or not applicable.
 */
const currentIndex = computed<number>(() => {
  if (!currentDateStr.value || !availableDates.value || availableDates.value.length === 0) {
    return -1;
  }
  // Normalize store dates (YYYY/MM/DD or YYYY-MM-DD) to YYYY/MM/DD for comparison
  const normalizedCurrentDate = currentDateStr.value.replace(/-/g, '/');
  return availableDates.value.findIndex(
    (d) => d.replace(/-/g, '/') === normalizedCurrentDate
  );
});

/**
 * Determines if the "Previous Date" button should be enabled.
 * @returns {boolean} True if navigation to a previous date is possible, false otherwise.
 */
const canGoPrevious = computed<boolean>(() => {
  return currentIndex.value > 0;
});

/**
 * Determines if the "Next Date" button should be enabled.
 * @returns {boolean} True if navigation to a next date is possible, false otherwise.
 */
const canGoNext = computed<boolean>(() => {
  return (
    currentIndex.value !== -1 &&
    currentIndex.value < availableDates.value.length - 1
  );
});

/**
 * Navigates to the previous available date for the current product.
 * Updates the date in the productStore.
 */
const goToPreviousDate = async (): Promise<void> => {
  if (canGoPrevious.value) {
    const prevDate = availableDates.value[currentIndex.value - 1];
    if (prevDate) {
      await productStore.setDate(prevDate.replace(/-/g, '/')); // Ensure store gets YYYY/MM/DD
    }
  }
};

/**
 * Navigates to the next available date for the current product.
 * Updates the date in the productStore.
 */
const goToNextDate = async (): Promise<void> => {
  if (canGoNext.value) {
    const nextDate = availableDates.value[currentIndex.value + 1];
    if (nextDate) {
      await productStore.setDate(nextDate.replace(/-/g, '/')); // Ensure store gets YYYY/MM/DD
    }
  }
};

/**
 * Computed property to get the list of products for the SelectMenu.
 * Ensures that the data passed to SelectMenu is always an array.
 * @returns {Product[]} An array of products.
 */
const productsForSelect = computed<Product[]>(() => {
    // Assuming getProducts returns Product[] or similar, or an empty array if undefined.
    // Replace 'Product' with the actual type if different.
    return availableDataStore.getProducts || [];
});

/**
 * Computed property to get the list of cropmasks for the SelectMenu.
 * Ensures that the data passed to SelectMenu is always an array.
 * @returns {CropmaskResultItem[]} An array of cropmasks.
 */
const cropmasksForSelect = computed<CropmaskResultItem[]>(() => {
    // Assuming getCropmasks returns an array or an empty array if undefined.
    return availableDataStore.getCropmasks || [];
});


/**
 * Computed property for the `allowed-dates` prop of the Datepicker.
 * It ensures that dates are in a format the datepicker can consume (e.g., YYYY/MM/DD strings or Date objects).
 * The productStore.getProductDates is assumed to return strings like 'YYYY/MM/DD' or 'YYYY-MM-DD'.
 * Datepicker typically handles these string formats.
 * @returns {string[]} An array of date strings.
 */
const allowedDatesForPicker = computed<string[]>(() => {
  return (productStore.getProductDates || []).map(dateStr => dateStr.replace(/-/g, '/'));
});
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
        <p class="text-xl md:text-2xl font-semibold text-white">
          Product
        </p>
        <SelectMenu
          :model-value="productStore.getSelectedProduct.product_id"
          :data="productsForSelect"
          key-by="product_id"
          label-by="display_name"
          placeholder="Select Product"
          @update:model-value="productStore.setProduct($event)"
          @change="handleProductSelection"
        />
      </div>
      <!-- Date Selection Section -->
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">
          Date
        </p>
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
            type="button"
            @click="goToPreviousDate"
          >
            &lt;
          </button>
          <!-- Datepicker Component -->
          <Datepicker
            v-model="selectedDate"
            :enable-time-picker="false"
            :allowed-dates="allowedDatesForPicker"
            :format="dateFormat"
            placeholder="Select Date"
            :clearable="true"
            :auto-apply="true"
            month-name-format="long"
            class="flex-grow"
            aria-label="Select Date"
            @update:model-value="handleDateSelection"
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
            type="button"
            @click="goToNextDate"
          >
            &gt;
          </button>
        </div>
      </div>
      <!-- Cropmask Selection Section -->
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">
          Cropmask
        </p>
        <SelectMenu
          :model-value="productStore.getSelectedProduct.cropmask_id"
          :data="cropmasksForSelect"
          key-by="cropmask_id"
          label-by="display_name"
          placeholder="Select Cropmask"
          @update:model-value="productStore.setCropmask($event)"
          @change="handleCropmaskSelection"
        />
      </div>
      <!-- Basemap Selection Section -->
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">
          Basemap
        </p>
        <SelectMenu
          :model-value="mapStore.selectedBasemap"
          :data="availableBasemaps"
          key-by="id"
          label-by="name"
          placeholder="Select Basemap"
          data-basemap-selector="true"
          @update:model-value="mapStore.setBasemap($event)"
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
  color: #333; /* Dark text for light background */
  background-color: #fff; /* Light background for the input */
  border-color: #6b7280; /* Tailwind gray-500 for border */
}

:deep(.dp__input_icon) {
  color: #6b7280; /* Tailwind gray-500 for icon */
}

:deep(.dp__clear_icon) {
  color: #6b7280; /* Tailwind gray-500 for clear icon */
}

:deep(.dp__theme_light) {
  /* If datepicker uses a specific theme class, you might need to target it */
  --dp-background-color: #ffffff;
  --dp-text-color: #212121;
  --dp-hover-color: #f3f3f3;
  --dp-hover-text-color: #212121;
  --dp-hover-icon-color: #959595;
  --dp-primary-color: #1976d2; /* Example primary color */
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #c0c0c0;
  --dp-border-color: #ccc;
  --dp-menu-border-color: #ddd;
  --dp-border-color-hover: #aaa;
  --dp-disabled-color: #f6f6f6;
  --dp-icon-color: #959595;
  --dp-danger-color: #ff6f60;
  --dp-highlight-color: rgba(25, 118, 210, 0.1);
}

/* Style for buttons to match general theme if needed */
button {
  transition: background-color 0.2s ease-in-out;
}
</style>
