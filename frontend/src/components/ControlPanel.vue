<script setup lang="ts">
import { useAvailableDataStore, type CropmaskResultItem } from '../stores/availableDataStore';
import { useProductStore } from '../stores/productStore'; // Removed 'type Product'
import { useMapStore } from '../stores/mapStore';
import SelectMenu from './SelectMenu.vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { watch, ref, computed, Ref } from 'vue';
import { useDraggableResizable } from '../composables/useDraggableResizable';

// Initialize stores
const availableDataStore = useAvailableDataStore();
const productStore = useProductStore();
const mapStore = useMapStore();

// Draggable and Resizable Composable
const controlPanelRef = ref<HTMLElement | null>(null);

// Initial dimensions - keep these consistent
const initialWidth = 384;
const initialHeight = 480; // Or your preferred initial height

const { position, dimensions, startDrag, startResize } = useDraggableResizable(
  controlPanelRef,
  {
    x: window.innerWidth - initialWidth - 10, // Consistent 10px buffer from the right edge
    y: window.innerHeight - initialHeight - 10, // Consistent 10px buffer from the bottom edge
  },
  { width: initialWidth, height: initialHeight }
);

/**
 * Represents an item in the basemap selection dropdown.
 */
interface BasemapOption {
  id: string;
  name: string;
  [key: string]: any; // Index signature for SelectMenu compatibility
}

/**
 * Local reactive state for the datepicker's v-model.
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

// ... existing watcher for selectedDate synchronization ...
watch(
  () => productStore.getSelectedProduct.date,
  (newStoreDate?: string) => {
    if (newStoreDate) {
      const newDateObj = new Date(newStoreDate.replace(/-/g, '/'));
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

// ... existing watcher for product_id changes ...
watch(
  () => productStore.getSelectedProduct.product_id,
  () => { /* ... */ }
);

// ... existing watcher for basemap changes ...
watch(
  () => mapStore.selectedBasemap,
  (newBasemap?: string) => {
    if (newBasemap) {
      const dropdown = document.querySelector(
        'select[data-basemap-selector="true"]'
      ) as HTMLSelectElement | null;
      if (dropdown && dropdown.value !== newBasemap) {
        dropdown.value = newBasemap;
      }
    }
  },
  { immediate: true }
);


const handleProductSelectionEvent = (value: unknown) => {
  if (typeof value === 'string' && value) {
    productStore.setProduct(value);
  }
};

const handleCropmaskSelectionEvent = (value: unknown) => {
  if (typeof value === 'string') { // Allow empty string for "no cropmask"
    productStore.setCropmask(value);
  } else if (value === null || value === undefined) {
    productStore.setCropmask(''); // Explicitly set to empty string
  }
};

const handleBasemapSelectionEvent = (value: unknown) => {
  if (typeof value === 'string' && value) {
    mapStore.setBasemap(value);
  }
};

// ... existing handleDateSelection, onDatepickerDateUpdate, dateFormat ...
const handleDateSelection = async (dateFromPicker: Date | null): Promise<void> => {
  if (dateFromPicker instanceof Date && !isNaN(dateFromPicker.getTime())) {
    const day = dateFromPicker.getDate().toString().padStart(2, '0');
    const month = (dateFromPicker.getMonth() + 1).toString().padStart(2, '0');
    const year = dateFromPicker.getFullYear();
    const storeDateString = `${year}/${month}/${day}`;
    await productStore.setDate(storeDateString);
  } else if (dateFromPicker === null) {
    await productStore.setDate(undefined);
  } else {
    console.warn(
      '[ControlPanel.vue EVENT @update:modelValue]: Received invalid date or unexpected value from datepicker:',
      dateFromPicker
    );
  }
};

const onDatepickerDateUpdate = (newDateVal: Date | null): void => {
  handleDateSelection(newDateVal);
};

const dateFormat = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

// ... existing computed properties: availableDates, currentDateStr, currentIndex, canGoPrevious, canGoNext ...
const availableDates = computed<string[]>(() => productStore.getProductDates || []);
const currentDateStr = computed<string | undefined>(
  () => productStore.getSelectedProduct.date
);
const currentIndex = computed<number>(() => {
  if (!currentDateStr.value || !availableDates.value || availableDates.value.length === 0) {
    return -1;
  }
  const normalizedCurrentDate = currentDateStr.value.replace(/-/g, '/');
  return availableDates.value.findIndex(
    (d) => d.replace(/-/g, '/') === normalizedCurrentDate
  );
});
const canGoPrevious = computed<boolean>(() => {
  return currentIndex.value > 0;
});
const canGoNext = computed<boolean>(() => {
  return (
    currentIndex.value !== -1 &&
    currentIndex.value < availableDates.value.length - 1
  );
});

// ... existing date navigation functions: goToPreviousDate, goToNextDate ...
const goToPreviousDate = async (): Promise<void> => {
  if (canGoPrevious.value) {
    const prevDate = availableDates.value[currentIndex.value - 1];
    if (prevDate) {
      await productStore.setDate(prevDate.replace(/-/g, '/'));
    }
  }
};

const goToNextDate = async (): Promise<void> => {
  if (canGoNext.value) {
    const nextDate = availableDates.value[currentIndex.value + 1];
    if (nextDate) {
      await productStore.setDate(nextDate.replace(/-/g, '/'));
    }
  }
};

/**
 * Computed property to get the list of products for the SelectMenu.
 * Using any[] for now to avoid complex type issues, assuming structure matches SelectMenu needs.
 */
const productsForSelect = computed<any[]>(() => {
    return availableDataStore.getProducts || [];
});

/**
 * Computed property to get the list of cropmasks for the SelectMenu.
 * Assuming CropmaskResultItem is compatible or SelectMenu is flexible.
 */
const cropmasksForSelect = computed<CropmaskResultItem[]>(() => {
    return availableDataStore.getCropmasks || [];
});


/**
 * Computed property for the `allowed-dates` prop of the Datepicker.
 */
const allowedDatesForPicker = computed<string[]>(() => {
  return (productStore.getProductDates || []).map(dateStr => dateStr.replace(/-/g, '/'));
});
</script>

<template>
  <div
    ref="controlPanelRef"
    class="control-panel-widget"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      width: dimensions.width + 'px',
      height: dimensions.height + 'px',
    }"
  >
    <div
      class="control-panel-header"
      @mousedown="startDrag"
    >
      <h4>Map Controls</h4>
    </div>

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
          <button
            :disabled="!canGoPrevious"
            class="date-nav-button"
            aria-label="Previous Date"
            type="button"
            @click="goToPreviousDate"
          >
            &lt;
          </button>
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
          <button
            :disabled="!canGoNext"
            class="date-nav-button"
            aria-label="Next Date"
            type="button"
            @click="goToNextDate"
          >
            &gt;
          </button>
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
    <div
      class="resize-handle resize-handle-br"
      @mousedown="startResize"
    />
  </div>
</template>

<style scoped>
/* Styles adapted from ChatWidget.vue and modernized */
.control-panel-widget {
  border: 1px solid #ccc; /* Matched from ChatWidget.vue */
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background: #231f1fc8; /* Matched from ChatWidget.vue */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2); /* Matched from ChatWidget.vue */
  overflow: hidden;
  position: fixed;
  z-index: 1000;
  color: white; /* Matched from ChatWidget.vue general text color */
}

.control-panel-header {
  background: #368535; /* Matched from ChatWidget.vue */
  color: white;
  padding: 10px; /* Matched from ChatWidget.vue */
  text-align: center;
  border-top-left-radius: 8px; /* Matched from ChatWidget.vue */
  border-top-right-radius: 8px; /* Matched from ChatWidget.vue */
  cursor: move;
  user-select: none;
}

.control-panel-header h4 {
  margin: 0;
  font-size: 1.2em;
  font-weight: 600;
}

.control-panel-body {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem; /* Increased gap */
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 1rem; /* Adjusted from text-xl */
  font-weight: 500;
  color: #9ca3af; /* gray-400 */
}

.date-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.date-nav-button {
  padding: 0.5rem 0.75rem;
  background-color: #4b5563; /* gray-600 */
  color: white;
  border: none;
  border-radius: 0.375rem; /* rounded-md */
  cursor: pointer;
  transition: background-color 0.2s;
}
.date-nav-button:hover:not(:disabled) {
  background-color: #6b7280; /* gray-500 */
}
.date-nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* SelectMenu and Datepicker specific styling */
:deep(.control-panel-body .select-menu-container .select-menu-input),
:deep(.control-panel-body .dp__input) {
  background-color: #374151; /* gray-700 */
  color: #d1d5db; /* gray-300 */
  border: 1px solid #4b5563; /* gray-600 */
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  width: 100%;
}
:deep(.control-panel-body .select-menu-container .select-menu-input:focus),
:deep(.control-panel-body .dp__input:focus) {
  border-color: #60a5fa; /* blue-400 */
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); /* blue-500 focus ring */
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
  border-right: 2px solid rgba(255, 255, 255, 0.5); /* Matched from ChatWidget.vue */
  border-bottom: 2px solid rgba(255, 255, 255, 0.5); /* Matched from ChatWidget.vue */
}

/* Datepicker theme overrides for dark mode */
:deep(.dp__theme_light) {
  --dp-background-color: #374151; /* gray-700 */
  --dp-text-color: #d1d5db;       /* gray-300 */
  --dp-hover-color: #4b5563;      /* gray-600 */
  --dp-hover-text-color: #f3f4f6; /* gray-100 */
  --dp-hover-icon-color: #9ca3af; /* gray-400 */
  --dp-primary-color: #3b82f6;    /* blue-500 */
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #6b7280;  /* gray-500 */
  --dp-border-color: #4b5563;     /* gray-600 */
  --dp-menu-border-color: #374151;/* gray-700 */
  --dp-border-color-hover: #6b7280;/* gray-500 */
  --dp-disabled-color: #4b5563;   /* gray-600 */
  --dp-icon-color: #9ca3af;       /* gray-400 */
  --dp-danger-color: #ef4444;     /* red-500 */
  --dp-highlight-color: rgba(59, 130, 246, 0.2); /* blue-500 with opacity */
  --dp-input-padding: 8px 12px; /* Match other inputs */
  --dp-font-size: 1rem;
}
:deep(.dp__input_icon),
:deep(.dp__clear_icon) {
  color: #9ca3af; /* gray-400 */
}

/* Ensure SelectMenu options are also styled for dark theme if it has its own dropdown */
:deep(.select-menu-options) {
  background-color: #374151; /* gray-700 */
  border: 1px solid #4b5563; /* gray-600 */
}
:deep(.select-menu-option) {
  color: #d1d5db; /* gray-300 */
}
:deep(.select-menu-option:hover),
:deep(.select-menu-option.selected) {
  background-color: #4b5563; /* gray-600 */
  color: #f3f4f6; /* gray-100 */
}

</style>
