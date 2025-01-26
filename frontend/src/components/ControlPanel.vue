<script setup lang="ts">
import { useAvailableDataStore } from '@/stores/availableDataStore'
import { useProductStore } from '@/stores/productStore'
import SelectMenu from './SelectMenu.vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { watch, ref } from 'vue'

const availableDataStore = useAvailableDataStore()
const productStore = useProductStore()

const selectedDate = ref(null)

watch(
  () => productStore.getSelectedProduct,
  (newVal, oldVal) => {
    selectedDate.value = new Date(productStore.getSelectedDate)
    if (newVal.date != oldVal.date || newVal.product_id != oldVal.product_id) {
      productStore.loadProductEntries()
    }
  },
  { deep: true }
)

const handleProductSelection = (selection) => {
  productStore.clickedPoint.show = false
  productStore.selectedProduct.product_id = selection.target.value
  productStore.loadProductEntries()
}

const handleCropmaskSelection = (selection) => {
  productStore.selectedProduct.cropmask_id = selection.target.value
}

const handleDateSelection = (selection) => {
  const day = selection.getDate().toString().padStart(2, '0')
  const month = (selection.getMonth() + 1).toString().padStart(2, '0')
  const year = selection.getFullYear()
  const iso = `${year}/${month}/${day}`
  selectedDate.value = iso
  productStore.selectedProduct.date = iso
}

const dateFormat = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}
</script>

<template>
  <div class="max-w-lg bg-[#231f1fc8] rounded-md shadow-dark-500 md:w-96 w-full h-auto" >
  <!-- <div class="control-panel"> -->
    <div class="flex flex-col w-full h-full p-3 md:p-7 md:space-y-3 space-y-2">
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Product</p>
        <SelectMenu placeholder="Select Product" :data="availableDataStore.getProducts" key-by="product_id"
          label-by="display_name" @change="handleProductSelection"></SelectMenu>
      </div>
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Date</p>
        <Datepicker v-model="selectedDate" :enableTimePicker="false" :allowedDates="productStore.getProductDates"
          :format="dateFormat" 
          @update:modelValue="handleDateSelection">
        </Datepicker>
      </div>
      <div class="flex flex-col justify-end space-y-2 items-center">
        <p class="text-xl md:text-2xl font-semibold text-white">Cropmask</p>
        <SelectMenu v-model="selectedDate" :data="availableDataStore.getCropmasks" key-by="cropmask_id"
          label-by="display_name" placeholder="Select Cropmask" @change="handleCropmaskSelection"></SelectMenu>
      </div>
    </div>
  </div>
</template>


<!-- <style scoped>
.control-panel {
  border: 1px solid #ccc;
  border-radius: 8px;
  width: 30vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgba(33, 28, 28, 0.818);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  position: relative;
}
</style> -->
