<script setup lang="ts">
import { TileLayer, type TileLayerProps } from '@deck.gl/geo-layers'
import { BitmapLayer } from '@deck.gl/layers'
import { inject, useAttrs, watch, onMounted } from 'vue'
import type { Layer } from '@deck.gl/core'

// Define props that are commonly passed to this TileLayer component
// These will be used by the TileLayer constructor via attrs
// but defining them silences the Vue warning about extraneous non-prop attributes.
const props = defineProps({
  data: { type: String, required: true },
  minZoom: { type: Number, default: 0 },
  maxZoom: { type: Number, default: 19 },
  // Add any other frequently used props here if desired
})

// JSDoc for type definition of the injected function
/**
 * @typedef {Function} UpdateLayersFunction
 * @param {Layer | Layer[]} layers - The layer or layers to update.
 * @returns {void}
 */

const attrs = useAttrs()
// Inject 'updateLayers' (plural) to match the provider in DeckGL.vue
const updateLayers = inject<((layers: Layer | Layer[]) => void) | undefined>(
  'updateLayers',
)

if (!updateLayers) {
  console.error(
    'TileLayer: updateLayers function not provided via injection. Ensure DeckGL.vue provides "updateLayers".',
  )
}

/**
 * Creates a new Deck.gl TileLayer instance based on the current component attributes and props.
 * @returns {TileLayer | null} A new TileLayer instance or null if updateLayers is not available.
 */
function createLayer(): TileLayer | null {
  if (!updateLayers) return null

  // Construct the TileLayer props, spreading current attributes
  // Props defined via defineProps are also available in attrs if not explicitly bound
  return new TileLayer({
    // renderSubLayers is a function that defines how individual tiles are rendered.
    // Here, it uses a BitmapLayer to display raster tile data.
    renderSubLayers: (props) => {
      const {
        bbox, // The bounding box of the tile
      } = props.tile

      // Type guard to check for GeoBoundingBox
      if ('west' in bbox) {
        const { west, south, east, north } = bbox
        return new BitmapLayer(props, {
          data: undefined, // Data is sourced from the parent TileLayer's image property
          image: props.data, // The image URL or texture for the tile
          bounds: [west, south, east, north], // Geographic bounds of the tile
        })
      }
      // Handle NonGeoBoundingBox or return null if it's not the expected type
      console.warn(
        'TileLayer: Bounding box is not in the expected geographic format.',
      )
      return null
    },
    ...(attrs as TileLayerProps), // Spread component attributes (e.g., data URL, minZoom, maxZoom)
    // Explicitly pass defined props to ensure they are used if attrs doesn't pick them up as expected
    // though ...attrs should typically include them.
    id:
      (attrs.id as string) ||
      `tile-layer-${Math.random().toString(36).substr(2, 9)}`,
    data: props.data,
    minZoom: props.minZoom,
    maxZoom: props.maxZoom,
  })
}

/**
 * Vue lifecycle hook called when the component is mounted.
 * Creates the initial TileLayer and adds it to the Deck.gl instance via the injected updateLayers function.
 */
onMounted(() => {
  const layer = createLayer()
  if (layer && updateLayers) {
    updateLayers([layer]) // Pass as an array if updateLayers expects an array
  }
})

// Watch for changes in component attributes (e.g., data URL) and props, and update the layer accordingly.
watch(
  () => [attrs, props],
  () => {
    const layer = createLayer()
    if (layer && updateLayers) {
      updateLayers([layer]) // Pass as an array if updateLayers expects an array
    }
  },
  { deep: true }, // Deep watch for changes within the attrs and props objects
)
</script>

<template>
  <div />
  <!-- Add an empty div as the root element -->
  <!-- This component does not render any DOM elements itself. -->
  <!-- Its purpose is to manage a Deck.gl layer. -->
</template>

<style>
.tile-layer-component {
  display: none;
}
</style>
