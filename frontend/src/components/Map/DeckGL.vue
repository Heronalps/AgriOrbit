/** * @file DeckGL.vue * @description Vue wrapper for Deck.gl, managing its
instance, view state, and layer rendering. * Integrates with a Mapbox map,
typically provided as a child component. */
<script setup lang="ts">
import { viewStateType } from '@/shared';
import { DECKGL_SETTINGS } from '@/utils/defaultSettings';
// Import necessary types from Deck.gl
import { Deck, type PickingInfo, type Layer } from '@deck.gl/core';
import { onMounted, onBeforeUnmount, provide, reactive, useAttrs } from 'vue';

/**
 * Captures non-prop attributes passed to this component.
 * These can be spread onto the Deck.gl instance if needed.
 */
const attrs = useAttrs();

/**
 * Holds the Deck.gl instance. Initialized in `onMounted`.
 */
let deckInstance: Deck | null = null;

/**
 * Defines the events emitted by this component.
 * @emits click - Emitted when the Deck.gl canvas is clicked, providing Deck.gl's `PickingInfo` and the original MouseEvent.
 */
const emit = defineEmits<{
  (e: 'click', payload: { info: PickingInfo; event: Event }): void;
}>();

/**
 * Reactive state for the Deck.gl view (camera position, zoom, etc.).
 * This state is two-way synchronized with the Deck.gl instance.
 * @type {viewStateType}
 */
const viewState = reactive<viewStateType>({
  latitude: 36.102376,    // Default initial latitude
  longitude: -80.649277,   // Default initial longitude
  zoom: 4,                 // Default initial zoom level
  pitch: 0,                // Default initial pitch (0 for 2D view)
  bearing: 0,              // Default initial bearing (0 for North up)
});

/**
 * Vue lifecycle hook called when the component is mounted.
 * Initializes the Deck.gl instance with specified configurations,
 * including initial view state, controller, and event handlers.
 */
onMounted(() => {
  deckInstance = new Deck({
    canvas: 'deck-canvas', // ID of the canvas element to render to
    initialViewState: viewState, // Set the initial map view
    controller: true, // Enable Deck.gl's built-in view controller (for pan, zoom, rotate)
    onViewStateChange: ({ viewState: newDeckViewState }) => {
      // Cast to viewStateType for type safety
      handleViewChange(newDeckViewState as viewStateType);
    },
    onClick: (info: PickingInfo, event: Event) => {
      // Emit a custom 'click' event with Deck.gl picking info and the original event
      emit('click', { info, event });
    },
    ...DECKGL_SETTINGS, // Spread default Deck.gl settings
    ...attrs, // Spread any additional attributes passed to this component
  });
});

/**
 * Vue lifecycle hook called before the component is unmounted.
 * Finalizes and cleans up the Deck.gl instance to prevent memory leaks.
 */
onBeforeUnmount(() => {
  if (deckInstance) {
    deckInstance.finalize();
    deckInstance = null;
  }
});

/**
 * Handles view state changes originating from Deck.gl interactions (e.g., user panning/zooming).
 * Updates the local reactive `viewState` to keep it synchronized.
 * @param {viewStateType} newDeckViewState - The new view state from Deck.gl.
 */
function handleViewChange(newDeckViewState: viewStateType): void {
  viewState.latitude = newDeckViewState.latitude;
  viewState.longitude = newDeckViewState.longitude;
  viewState.zoom = newDeckViewState.zoom;
  viewState.pitch = newDeckViewState.pitch;
  viewState.bearing = newDeckViewState.bearing;
}

/**
 * Updates the layers rendered by the Deck.gl instance.
 * This function is provided to child components (e.g., TileLayer),
 * enabling them to dynamically manage the data layers on the map.
 * @param {Layer[]} newLayers - An array of new Deck.gl layer instances to render.
 */
function updateLayers(newLayers: Layer[]): void {
  if (deckInstance) {
    deckInstance.setProps({ layers: newLayers });
  }
}

// Provide the reactive viewState and the updateLayers function to child components.
provide('viewState', viewState);
provide('updateLayers', updateLayers); // Ensure clarity in provided function name
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
