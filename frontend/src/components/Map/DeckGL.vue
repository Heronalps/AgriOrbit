/** * @file DeckGL.vue * @description Vue wrapper for Deck.gl, managing its
instance, view state, and layer rendering. * Integrates with a Mapbox map,
typically provided as a child component. */
<script setup lang="ts">
import { viewStateType } from '@/shared'
import { DECKGL_SETTINGS } from '@/utils/defaultSettings'
// Import necessary types from Deck.gl
import { Deck, type Layer, type PickingInfo } from '@deck.gl/core'
import type { MjolnirGestureEvent } from 'mjolnir.js'
import { onMounted, onBeforeUnmount, provide, useAttrs, watch } from 'vue'
import { useMapViewState } from '@/composables/useMapViewState'

/**
 * Captures non-prop attributes passed to this component.
 * These can be spread onto the Deck.gl instance if needed.
 */
const attrs = useAttrs()

/**
 * Holds the Deck.gl instance. Initialized in `onMounted`.
 */
let deckInstance: Deck | null = null

/**
 * Defines the events emitted by this component.
 * @emits click - Emitted when the Deck.gl canvas is clicked, providing Deck.gl's `PickingInfo` and the original MouseEvent.
 */
const emit = defineEmits<{
  (e: 'click', payload: { info: PickingInfo; event: MjolnirGestureEvent }): void
}>()

// Define component props to accept isSelectingLocation for cursor management
const props = defineProps({
  isSelectingLocation: {
    type: Boolean,
    default: false,
  },
})

/**
 * Using the centralized map view state composable.
 * This state is two-way synchronized with the Deck.gl instance.
 */
const { viewState, updateViewState } = useMapViewState()

/**
 * Vue lifecycle hook called when the component is mounted.
 * Initializes the Deck.gl instance with specified configurations,
 * including initial view state, controller, and event handlers.
 */
onMounted(() => {
  deckInstance = new Deck({
    onViewStateChange: ({ viewState: newDeckViewState }) => {
      // Cast to viewStateType for type safety
      handleViewChange(newDeckViewState as viewStateType)
    },
    onClick: (info: PickingInfo, event: MjolnirGestureEvent) => {
      // Emit a custom 'click' event with Deck.gl picking info and the original event
      emit('click', { info, event })
    },
    // Add getCursor callback to change cursor style based on isSelectingLocation prop
    getCursor: ({ isDragging }: { isDragging: boolean }) => {
      if (props.isSelectingLocation) {
        return 'crosshair' // Use crosshair when selecting location
      }
      return isDragging ? 'grabbing' : 'grab' // Default grab/grabbing cursors
    },
    ...DECKGL_SETTINGS, // Spread default Deck.gl settings
    ...attrs, // Spread any additional attributes passed to this component
  })
})

/**
 * Vue lifecycle hook called before the component is unmounted.
 * Finalizes and cleans up the Deck.gl instance to prevent memory leaks.
 */
onBeforeUnmount(() => {
  if (deckInstance) {
    deckInstance.finalize()
    deckInstance = null
  }
})

/**
 * Handles view state changes originating from Deck.gl interactions (e.g., user panning/zooming).
 * Updates the reactive view state via the composable.
 * @param {viewStateType} newDeckViewState - The new view state from Deck.gl.
 */
function handleViewChange(newDeckViewState: viewStateType): void {
  // Use updateViewState for all view state changes to avoid readonly warnings
  updateViewState(newDeckViewState)
}

/**
 * Updates the layers rendered by the Deck.gl instance.
 * This function is provided to child components (e.g., TileLayer),
 * enabling them to dynamically manage the data layers on the map.
 * @param {Layer[]} newLayers - An array of new Deck.gl layer instances to render.
 */
function updateLayers(newLayers: Layer[]): void {
  if (deckInstance) {
    deckInstance.setProps({ layers: newLayers })
  }
}

// Provide the reactive viewState and the updateLayers function to child components.
provide('viewState', viewState)
provide('updateLayers', updateLayers) // Ensure clarity in provided function name

// Watch for changes in the isSelectingLocation prop to update the cursor dynamically
watch(
  () => props.isSelectingLocation,
  (newValue) => {
    if (deckInstance) {
      // Update the getCursor prop when isSelectingLocation changes
      deckInstance.setProps({
        getCursor: ({ isDragging }: { isDragging: boolean }) => {
          if (newValue) {
            // Use newValue from the watcher argument
            return 'crosshair'
          }
          return isDragging ? 'grabbing' : 'grab'
        },
      })
    }
  },
)
</script>

<template>
  <div class="deckgl-container relative h-full w-full">
    <!--
      Slot for child components. Typically includes:
      1. A base map component (e.g., MapboxView) rendering beneath Deck.gl layers.
      2. Data layer components (e.g., TileLayer) utilizing the 'updateLayers' provided function.
    -->
    <slot />
    <!-- Canvas element for Deck.gl rendering -->
    <canvas
      id="deck-canvas"
      class="deck-canvas absolute top-0 left-0 h-full w-full"
    />
  </div>
</template>

<style scoped>
/* Scoped styles for the DeckGL component. */
.deckgl-container {
  /*
   * The container itself should not intercept mouse events by default,
   * allowing underlying elements (like a Mapbox map) to remain interactive.
   * Pointer events are enabled specifically on the canvas where Deck.gl renders.
   */
  pointer-events: none;
}

.deck-canvas {
  /*
   * Enable pointer events on the Deck.gl canvas for interactions
   * such as click, pan, and zoom.
   */
  pointer-events: auto;
}
</style>
