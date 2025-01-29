import { getAvailableCropmasks } from "@/api/cropmask"
import { getAvailableProducts } from '@/api/datasets'
import { defineStore } from 'pinia'

// Define proper types for the API responses
interface CropmaskResult {
  results: Array<{
    cropmask_id: string;
    display_name: string;
    [key: string]: unknown;
  }>;
}

interface ProductResult {
  results: Array<productType>;
  [key: string]: unknown;
}

export type availableDataState = {
  cropmasks: CropmaskResult;
  products: ProductResult;
  adminLayer: Array<Record<string, unknown>>;
}

export const useAvailableDataStore = defineStore('availableDataStore', {
  state: () => ({
    cropmasks: { results: [] },
    products: { results: [] },
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
      // const product = useProductStore() // Commented out unused variable
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
