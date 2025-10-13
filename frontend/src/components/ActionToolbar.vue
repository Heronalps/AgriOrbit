<template>
  <PToolbar class="action-toolbar widget-dark-theme">
    <template #start>
      <div class="toolbar-title">AgriOrbit</div>
      <PButton
        ref="selectLocationButtonRef"
        icon="pi pi-map-marker"
        label="Select Farm Location"
        class="p-button-custom-grey action-toolbar-button"
        aria-label="Select Farm Location on Map"
        @click="triggerLocationSelection"
      />
      <PButton
        ref="generalChatButtonRef"
        icon="pi pi-comments"
        label="Start General Chat"
        class="p-button-custom-grey action-toolbar-button"
        aria-label="Start a General Chat"
        @click="triggerGeneralChat"
      />
    </template>
  </PToolbar>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, ComponentPublicInstance } from 'vue'
import PToolbar from 'primevue/toolbar'
import PButton from 'primevue/button'
import { useLocationStore } from '@/stores/locationStore'

const locationStore = useLocationStore()

// Define refs for the buttons
const selectLocationButtonRef = ref<ComponentPublicInstance | null>(null)
const generalChatButtonRef = ref<ComponentPublicInstance | null>(null)

function triggerLocationSelection(): void {
  console.log('[ActionToolbar] Triggering location selection via store.')
  locationStore.startLocationSelection()
}

function triggerGeneralChat(): void {
  // Dispatch a global event that ChatWidget.vue listens to
  window.dispatchEvent(new CustomEvent('start-general-chat'))
}

onMounted(() => {
  nextTick(() => {
    const button1El = selectLocationButtonRef.value?.$el as
      | HTMLElement
      | undefined
    const button2El = generalChatButtonRef.value?.$el as HTMLElement | undefined

    if (button1El && button2El) {
      const width1 = button1El.offsetWidth
      const width2 = button2El.offsetWidth
      const maxWidth = Math.max(width1, width2)

      if (maxWidth > 0) {
        button1El.style.minWidth = `${maxWidth}px`
        button2El.style.minWidth = `${maxWidth}px`
      }
    }
  })
})
</script>

<style scoped>
.action-toolbar {
  position: fixed;
  top: 10px; /* Add some padding from the top */
  left: 10px; /* Add some padding from the left */
  z-index: 1050; /* Ensure it's above map elements but below potential modals */
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-2); /* Add a subtle shadow */
  padding: 0.5rem;
  display: flex; /* Ensure items are in a row */
  align-items: center; /* Vertically align items */
}

.toolbar-title {
  font-size: 1.25rem; /* Similar to panel headers */
  font-weight: bold;
  color: var(--widget-header-text-color);
  background-color: var(--widget-header-background);
  padding: 0.7rem 1rem; /* Adjusted vertical padding */
  border-radius: var(--border-radius-sm);
  margin-right: 0.5rem; /* Space between title and buttons */
}

.action-toolbar-button {
  margin-right: 0.5rem; /* Add some spacing between buttons */
  display: flex;
  justify-content: center;
}

/* Remove margin from the last button */
.action-toolbar-button:last-child {
  margin-right: -1rem;
}
</style>
