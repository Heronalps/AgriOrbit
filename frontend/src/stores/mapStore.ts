import { defineStore } from 'pinia'
// Import the store type itself, not just the state type
import { useProductStore, type ProductStore } from './productStore'

// Define a type for layer definitions. Using Record<string, unknown> as a generic placeholder.
type LayerDefinition = Record<string, unknown>;

export interface mapState {
  layers: Record<string, LayerDefinition | null>; // Replaced 'any' with LayerDefinition
}

export const useMapStore = defineStore('map', {
  state: () => ({
    layers: { product: null, admin: null },
  }) as mapState,
  getters: {
    // Updated return type from Array<any> to (LayerDefinition | null)[]
    // Removed redundant 'if (!state.layers)' check as state.layers is always initialized.
    layers(state): (LayerDefinition | null)[] {
      return Object.values(state.layers);
    },
  },
  actions: {
    async renderLayers() {
      // Type 'product' as the ProductStore instance
      const product: ProductStore = useProductStore()
      product.renderTileLayer() // Removed assignment to unused variable tileLayer
    },
    // async renderTileLayer() {
    //   const data = await renderTileLayer()
    //   this.products = data
    // },
  },
})
