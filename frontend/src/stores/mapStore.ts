import { defineStore } from 'pinia'
import { productState, useProductStore } from './productStore'

export interface mapState {
  layers: Record<string, any | null>
}

export const useMapStore = defineStore('map', {
  state: () => ({
    layers: { product: null, admin: null },
  }) as mapState,
  getters: {
    layers(state): Array<any> {
      if (!state.layers){
        return 
      }
      return Object.values(state.layers)
    },
  },
  actions: {
    async renderLayers() {
      const product: productState = useProductStore()
      product.renderTileLayer() // Removed assignment to unused variable tileLayer
    },
    // async renderTileLayer() {
    //   const data = await renderTileLayer()
    //   this.products = data
    // },
  },
})
