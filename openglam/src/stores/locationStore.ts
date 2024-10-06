// locationStore.ts
import { defineStore } from 'pinia'

type targetLocationType = {
  longitude: number;
  latitude: number;
} | null

export interface locationState {
  targetLocation: targetLocationType;
}

export const useLocationStore = defineStore('locationStore', {
  state: () => ({
    targetLocation: null
  }) as locationState,

  actions: {
    setTargetLocation(location: targetLocationType) {
      this.targetLocation = location;
    },

    clearTargetLocation() {
      this.targetLocation = null;
    },

    getTargetLocation(): targetLocationType {
      return this.targetLocation;
    }
  },
})