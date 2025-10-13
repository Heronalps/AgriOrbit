import { defineStore } from 'pinia'

/**
 * @interface mapState
 * Defines the state structure for the map store.
 * @property {string} selectedBasemap - Tracks the ID of the currently selected basemap.
 */
export interface mapState {
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
    selectedBasemap: 'dark', // Default basemap set to 'dark' (e.g., Mapbox Dark)
  }),
  getters: {},
  actions: {
    /**
     * Sets the current basemap for the map.
     * @param {string} basemapId - The identifier of the basemap to set (e.g., 'dark', 'satellite').
     */
    setBasemap(basemapId: string) {
      this.selectedBasemap = basemapId
    },
  },
})
