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
    cropmaskCache: null, // Cache for cropmasks
    productCache: null, // Cache for products
    cacheTimestamp: null, // Timestamp for cache invalidation
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
    async loadAvailableProducts(): Promise<void> {
      if (this.productCache) {
        this.products = this.productCache;
        return;
      }

      const data = await getAvailableProducts();
      this.products = data;
      this.productCache = data;
      this.cacheTimestamp = Date.now();
    },

    async loadAvailableCropmasks(): Promise<void> {
      if (this.cropmaskCache) {
        this.cropmasks = this.cropmaskCache;
        return;
      }

      const data = await getAvailableCropmasks();
      this.cropmasks = data;
      this.cropmaskCache = data;
      this.cacheTimestamp = Date.now();
    },

    async loadAvailableAdminLayers(): void {
      // const data = await availableAdminLayers()
      // this.adminLayers = data
    },
  },
})
