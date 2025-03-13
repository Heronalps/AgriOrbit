/**
 * @file locationStore.ts
 * @description Pinia store for managing the target geographical location.
 */
import { defineStore } from 'pinia'

/**
 * Type definition for the target location.
 * It can be an object with longitude and latitude, or null if no location is set.
 */
export type TargetLocationType = {
  longitude: number;
  latitude: number;
} | null

/**
 * Interface for the location store's state.
 */
export interface LocationState {
  /** The current target location, or null if not set. */
  targetLocation: TargetLocationType;
}

export const useLocationStore = defineStore('locationStore', {
  state: (): LocationState => ({
    targetLocation: null,
  }),

  getters: {
    /**
     * Retrieves the current target location.
     * @param {LocationState} state - The current store state.
     * @returns {TargetLocationType} The target location.
     */
    getTargetLocation(state: LocationState): TargetLocationType {
      return state.targetLocation;
    },
  },

  actions: {
    /**
     * Sets the target geographical location.
     * @param {TargetLocationType} location - The location to set, or null to clear.
     */
    setTargetLocation(location: TargetLocationType) {
      this.targetLocation = location;
    },

    /**
     * Clears the target geographical location, setting it to null.
     */
    clearTargetLocation() {
      this.targetLocation = null;
    },
  },
})