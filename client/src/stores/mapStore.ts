import { defineStore } from 'pinia'
import { productState, useProductStore } from './productStore'

export interface mapState {
  layers: Object<any>
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
      const tileLayer = product.renderTileLayer()
    },
    // async renderTileLayer() {
    //   const data = await renderTileLayer()
    //   this.products = data
    // },
  },
})
