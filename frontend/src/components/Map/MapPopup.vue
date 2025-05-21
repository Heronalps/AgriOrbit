<script setup lang="ts">
import { useProductStore } from '@/stores/productStore'
import { computed } from 'vue'

const productStore = useProductStore()

/**
 * Computed property for the absolute X position of the popup.
 * Appends 'px' to the x-coordinate from the productStore.
 */
const absX = computed<string>(() => `${productStore.clickedPoint.x}px`)

/**
 * Computed property for the absolute Y position of the popup.
 * Appends 'px' to the y-coordinate from the productStore.
 */
const absY = computed<string>(() => `${productStore.clickedPoint.y}px`)

/**
 * Computed property for the content to be displayed in the popup.
 * Handles loading state, error messages, numeric values, and fallback text.
 */
const displayContent = computed<string>(() => {
  const point = productStore.clickedPoint

  if (!point) return 'No data' // Guard against point being null/undefined initially

  if (point.isLoading) {
    return 'Loading...'
  }
  if (point.errorMessage) {
    return point.errorMessage
  }
  if (typeof point.value === 'number' && !isNaN(point.value)) {
    return point.value.toFixed(2)
  }
  return 'Point selected' // Fallback if no other specific content
})

/**
 * Computed property to determine if a loading indicator should be shown.
 */
const isLoading = computed<boolean>(
  () => productStore.clickedPoint && productStore.clickedPoint.isLoading,
)

/**
 * Computed property to determine if an error indicator should be shown.
 */
const hasError = computed<boolean>(
  () => productStore.clickedPoint && !!productStore.clickedPoint.errorMessage,
)

/**
 * Hides the popup by setting the 'show' property in the productStore to false.
 */
function hidePopup(): void {
  productStore.clickedPoint.show = false
}
</script>

<template>
  <POverlayPanel
    v-if="productStore.clickedPoint && productStore.clickedPoint.show"
    :showCloseIcon="true"
    :class="['map-popup']"
    :style="{ left: absX, top: absY }"
    :dismissable="true"
    :autoZIndex="true"
    :baseZIndex="1001"
    appendTo="self"
    @hide="hidePopup"
  >
    <template #content>
      <div class="popup-content">
        <i v-if="isLoading" class="pi pi-spin pi-spinner mr-2" />
        <i
          v-else-if="hasError"
          class="pi pi-exclamation-triangle text-red-500 mr-2"
        />
        <span :class="{ 'font-bold': !isLoading && !hasError }">{{
          displayContent
        }}</span>
      </div>
    </template>
  </POverlayPanel>
</template>

<style scoped>
.map-popup {
  position: absolute;
  min-width: 120px;
}

.popup-content {
  display: flex;
  align-items: center;
  padding: 0.25rem;
}

:deep(.p-overlaypanel) {
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  background-color: white;
}

:deep(.p-overlaypanel-content) {
  padding: 0.75rem 1rem;
}

:deep(.p-overlaypanel-close) {
  background: transparent;
  color: var(--neutral-700);
  width: 1.5rem;
  height: 1.5rem;
  transition: background-color 0.2s;
}

:deep(.p-overlaypanel-close:hover) {
  background: var(--neutral-200);
  color: var(--neutral-900);
}
</style>
