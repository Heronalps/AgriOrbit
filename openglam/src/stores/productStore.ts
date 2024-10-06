// productStore.ts
import { getDatasetEntries } from "@/api/datasets"
import { getValueAtPoint } from "@/api/point"
import { computeTileLayerURL } from '@/api/tile'
import { defineStore } from 'pinia'

export interface productState  {
  selectedProduct: selectedProductType,
  productEntries: Array<any>,
  clickedPoint: clickedPointType
}

export const useProductStore = defineStore('productStore', {
  state: () => ({
    selectedProduct: {},
    productEntries: [],
    clickedPoint: {}
  }) as productState,

  getters: {
    getSelectedProduct(state): selectedProductInterface {
      return state.selectedProduct
    },
    getSelectedDate(state): string {
      return state.selectedProduct.date
    },
    getProductDates(state): Array<any> {
      if (!state.productEntries.results) return []

      return state.productEntries.results.map(el => el.date).map(el => el.replaceAll('-', '/'))
    },
  },

  actions: {
    async loadProductEntries() {
      const data = await getDatasetEntries(this.selectedProduct)
      this.productEntries = data
      this.selectedProduct.date = this.getProductDates.at(-1)
    },
    async loadValueAtPoint(x, y) {
      const data = await getValueAtPoint(this.selectedProduct, x, y)
      this.clickedPoint.value = data.value
    },
    getTileLayerURL(){
      return computeTileLayerURL(this.selectedProduct)
    }
  },
})