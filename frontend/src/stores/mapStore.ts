import { defineStore } from 'pinia'
// Import the store type itself, not just the state type
import { useProductStore, type ProductStore } from './productStore'

// Define a type for layer definitions. Using Record<string, unknown> as a generic placeholder.
type LayerDefinition = Record<string, unknown>;

export interface mapState {
  layersState: Record<string, LayerDefinition | null>; // Renamed from 'layers' to 'layersState'
  selectedBasemap: string; // Add selectedBasemap to track the current basemap
}

export const useMapStore = defineStore('map', {
  state: () => ({
    layersState: { product: null, admin: null },
    selectedBasemap: 'dark', // Set the initial basemap to 'dark' (Mapbox Dark)
  }) as mapState,
  getters: {
    // Updated return type from Array<any> to (LayerDefinition | null)[]. 
    // Removed redundant 'if (!state.layers)' check as state.layers is always initialized.
    layers(state): (LayerDefinition | null)[] {
      return Object.values(state.layersState); // Updated to use 'layersState'
    },
  },
  actions: {
    async renderLayers() {
      // Type 'product' as the ProductStore instance
      const product: ProductStore = useProductStore()
      product.renderTileLayer() // Removed assignment to unused variable tileLayer
    },
    setBasemap(basemapId: string) {
      this.selectedBasemap = basemapId;
    },
    // async renderTileLayer() {
    //   const data = await renderTileLayer()
    //   this.products = data
    // },
  },
})
