import { defineStore } from 'pinia'

/**
 * @typedef {Record<string, unknown>} LayerDefinition
 * Represents the structure of a map layer definition.
 * Using Record<string, unknown> as a generic placeholder; can be refined
 * if the specific structure of layer definitions is known.
 */
type LayerDefinition = Record<string, unknown>

/**
 * @interface mapState
 * Defines the state structure for the map store.
 * @property {Record<string, LayerDefinition | null>} layersState - Stores the state of different map layers (e.g., product, admin).
 * @property {string} selectedBasemap - Tracks the ID of the currently selected basemap.
 */
export interface mapState {
  layersState: Record<string, LayerDefinition | null>
  selectedBasemap: string
}

/**
 * Pinia store for managing map-related state.
 * This includes managing map layers, basemaps, and interactions.
 */
export const useMapStore = defineStore('map', {
  /**
   * Defines the initial state of the map store.
   * @returns {mapState} The initial state object.
   */
  state: (): mapState => ({
    layersState: { product: null, admin: null }, // Initial layer states
    selectedBasemap: 'dark', // Default basemap set to 'dark' (e.g., Mapbox Dark)
  }),
  getters: {
    /**
     * Retrieves all active layer definitions.
     * @param {mapState} state - The current state of the map store.
     * @returns {(LayerDefinition | null)[]} An array of layer definitions or null.
     */
    layers(state): (LayerDefinition | null)[] {
      return Object.values(state.layersState)
    },
  },
  actions: {
    /**
     * Sets the product layer definition in the map state.
     * @param {LayerDefinition} layerDefinition - The layer definition for the product.
     */
    setProductLayer(layerDefinition: LayerDefinition) {
      this.layersState.product = { ...layerDefinition } // Use spread to ensure reactivity
    },

    /**
     * Clears the product layer definition from the map state.
     */
    clearProductLayer() {
      this.layersState.product = null
    },

    /**
     * Sets the current basemap for the map.
     * @param {string} basemapId - The identifier of the basemap to set (e.g., 'dark', 'satellite').
     */
    setBasemap(basemapId: string) {
      this.selectedBasemap = basemapId
    },
  },
})
