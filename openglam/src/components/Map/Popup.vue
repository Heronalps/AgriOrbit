<script setup lang="ts">
import { useProductStore } from '@/stores/productStore'
import { computed } from 'vue'

const productStore = useProductStore()

const absX = computed(() => productStore.clickedPoint.x + 'px')
const absY = computed(() => productStore.clickedPoint.y + 'px')
const value = computed(() =>
  isNaN(productStore.clickedPoint.value)
    ? 'No Data'
    : productStore.clickedPoint.value.toFixed(2)
)
</script>

<template>
  <div
    v-if="productStore.clickedPoint.show && !isNaN(productStore.clickedPoint.value)"
    :class="productStore.clickedPoint.show ? 'absolute' : 'hidden'"
    :style="{ left: absX, top: absY }"
    class="font-bold text-lg p-2 rounded-xl flex flex-row space-x-3 items-center bg-white"
  >
    <p>{{ value }}</p>
    <div
      @click="productStore.clickedPoint.show = false"
      class="text-right cursor-pointer text-gray-600 text-xs"
    >
      X
    </div>
  </div>
</template>