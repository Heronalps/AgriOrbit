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
  longitude: number
  latitude: number
} | null

/**
 * Interface for the location store's state.
 */
export interface LocationState {
  /** The current target location, or null if not set. */
  targetLocation: TargetLocationType
  /** Whether the user is currently in the process of selecting a location. */
  isSelectingLocation: boolean
}

export const useLocationStore = defineStore('locationStore', {
  state: (): LocationState => ({
    targetLocation: null,
    isSelectingLocation: false,
  }),

  actions: {
    /**
     * Sets the target geographical location.
     * @param {TargetLocationType} location - The location to set, or null to clear.
     */
    setTargetLocation(location: TargetLocationType) {
      this.targetLocation = location
      this.isSelectingLocation = false // Turn off selection mode once a location is set
    },

    /**
     * Activates location selection mode.
     */
    startLocationSelection() {
      this.isSelectingLocation = true
    },

    /**
     * Deactivates location selection mode.
     */
    cancelLocationSelection() {
      this.isSelectingLocation = false
    },
  },
})
