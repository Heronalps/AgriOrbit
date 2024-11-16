// import { useProductStore } from './productStore'
import { getAvailableCropmasks } from "@/api/cropmask"
import { getAvailableProducts } from '@/api/datasets'
import { defineStore } from 'pinia'
import { useProductStore } from "./productStore"
export type availableDataState = {
  cropmasks: Array<any>,
  products: productsType,
  adminLayer: Array<any>
}

export const useAvailableDataStore = defineStore('availableDataStore', {
  state: () => ({
    cropmasks: [],
    products: [],
    adminLayers: [],
  }) as availableDataState,
  getters: {
    getCropmasks(state) {
      return state.cropmasks.results || []
    },
    getProducts(state): Array<productType> {
      return state.products.results || []
    },
    getAdminLayers(state) {
      return state.adminLayers
    },
  },
  actions: {
    async loadAvailableProducts(): void {
      const product = useProductStore()
      const data = await getAvailableProducts()
      this.products = data
    },
    async loadAvailableCropmasks(): void {
      const data = await getAvailableCropmasks()
      this.cropmasks = data
    },
    async loadAvailableAdminLayers(): void {
      // const data = await availableAdminLayers()
      // this.adminLayers = data
    },
  },
})
