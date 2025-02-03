<script setup lang="ts">
import { useAvailableDataStore } from '@/stores/availableDataStore'
import { useProductStore } from '@/stores/productStore'
import SelectMenu from './SelectMenu.vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { watch, ref } from 'vue'

const availableDataStore = useAvailableDataStore()
const productStore = useProductStore()

const selectedDate = ref<Date | null>(null) // Ensure selectedDate is typed

// Watcher for date changes from the store
watch(
  () => productStore.getSelectedProduct.date,
  (newStoreDate) => {
    console.log(`[ControlPanel.vue WATCHER productStore.date]: Store date changed to: ${newStoreDate}`);
    if (newStoreDate) {
      const newDateObj = new Date(newStoreDate); // Dates from store are YYYY/MM/DD
      // Check if selectedDate (v-model for datepicker) is already equivalent
      if (!selectedDate.value || selectedDate.value.getTime() !== newDateObj.getTime()) {
        console.log(`[ControlPanel.vue WATCHER productStore.date]: Updating local selectedDate for datepicker to: ${newDateObj}`);
        selectedDate.value = newDateObj;
      } else {
        console.log(`[ControlPanel.vue WATCHER productStore.date]: Local selectedDate already matches store date. No UI update needed.`);
      }
    } else {
      if (selectedDate.value !== null) {
        console.log(`[ControlPanel.vue WATCHER productStore.date]: Store date is null/undefined. Clearing local selectedDate.`);
        selectedDate.value = null;
      } else {
        console.log(`[ControlPanel.vue WATCHER productStore.date]: Local selectedDate already null. No UI update needed.`);
      }
    }
  },
  { immediate: true } // Sync on component load/initial product selection
);

watch(
  () => productStore.getSelectedProduct.product_id,
  (newProductId, oldProductId) => {
    console.log(`[ControlPanel.vue WATCHER productStore.product_id]: Product ID changed from ${oldProductId} to ${newProductId}`);
    // The date watcher above will handle updating selectedDate when the store's date changes as a result of the product change
  }
);

const handleProductSelection = async (selection) => {
  const newProductId = selection.target.value;
  console.log(`[ControlPanel.vue EVENT ProductSelect]: Product selected: ${newProductId}. Calling productStore.setProduct().`);
  await productStore.setProduct(newProductId);
  console.log(`[ControlPanel.vue EVENT ProductSelect]: productStore.setProduct() called for ${newProductId}.`);
};

const handleCropmaskSelection = async (selection) => {
  const newCropmaskId = selection.target.value;
  console.log(`[ControlPanel.vue EVENT CropmaskSelect]: Cropmask selected: ${newCropmaskId}. Calling productStore.setCropmask().`);
  await productStore.setCropmask(newCropmaskId);
  console.log(`[ControlPanel.vue EVENT CropmaskSelect]: productStore.setCropmask() called for ${newCropmaskId}.`);
};

// Handler for the datepicker's update event
const handleDateSelection = async (dateFromPicker: Date | null) => {
  console.log('[ControlPanel.vue EVENT @update-model-value]: Datepicker emitted event with value:', dateFromPicker);

  if (dateFromPicker instanceof Date && !isNaN(dateFromPicker.getTime())) {
    const day = dateFromPicker.getDate().toString().padStart(2, '0');
    const month = (dateFromPicker.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const year = dateFromPicker.getFullYear();
    const isoDate = `${year}/${month}/${day}`;
    console.log(`[ControlPanel.vue EVENT @update-model-value]: Formatted to YYYY/MM/DD: ${isoDate}. Attempting to call productStore.setDate().`);
    await productStore.setDate(isoDate);
    console.log(`[ControlPanel.vue EVENT @update-model-value]: productStore.setDate() called with ${isoDate}.`);
  } else if (dateFromPicker === null) {
    console.log('[ControlPanel.vue EVENT @update-model-value]: Datepicker emitted null (date cleared). Attempting to call productStore.setDate(undefined).');
    await productStore.setDate(undefined);
    console.log('[ControlPanel.vue EVENT @update-model-value]: productStore.setDate(undefined) called.');
  } else {
    console.warn('[ControlPanel.vue EVENT @update-model-value]: Received invalid date or unexpected value:', dateFromPicker);
  }
};

const onDatepickerDateUpdate = (newDateVal: Date | null) => { // Allow null for clearable
  console.log('[ControlPanel.vue EVENT @date-update]: Datepicker emitted @date-update. Value:', newDateVal);
  // Call the main handler when @date-update fires
  handleDateSelection(newDateVal);
};

const dateFormat = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};
</script>

<template>
  <div class="max-w-lg bg-[#231f1fc8] rounded-md shadow-dark-500 md:w-96 w-full h-auto">
    <div class="flex flex-col w-full h-full p-3 md:p-7 md:space-y-3 space-y-2">
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Product</p>
        <SelectMenu
          placeholder="Select Product"
          :data="availableDataStore.getProducts"
          key-by="product_id"
          label-by="display_name"
          @change="handleProductSelection"
        />
      </div>
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Date</p>
        <Datepicker
          v-model="selectedDate"
          :enable-time-picker="false"
          :allowed-dates="productStore.getProductDates" 
          :format="dateFormat"
          @update-model-value="handleDateSelection"
          @date-update="onDatepickerDateUpdate"
          placeholder="Select Date"
          :clearable="true"
          :auto-apply="true"
        />
      </div>
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
    </div>
  </div>
</template>

<style scoped>
/* ... existing styles ... */
</style>
