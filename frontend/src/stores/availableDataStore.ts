/**
 * @file availableDataStore.ts
 * @description Pinia store for managing available data like products, cropmasks, and administrative layers.
 * This store handles fetching this data from the API, caching it, and providing access to it.
 */
import { defineStore } from 'pinia'
import type { productType } from '../api.d' // Corrected import path
import { getAvailableProducts as fetchProductsApi } from '../api/datasets' // Corrected import path
import { getAvailableCropmasks as fetchCropmasksApi } from '../api/cropmask' // Corrected import path

// Define proper types for the API responses
/**
 * Interface for a single cropmask item.
 */
export interface CropmaskResultItem {
  /** Unique identifier for the cropmask. */
  cropmask_id: string
  /** User-friendly display name for the cropmask. */
  display_name: string
  /** Allows for other properties not strictly typed, providing flexibility. */
  [key: string]: unknown
}

/**
 * Interface for the API response when fetching available cropmasks.
 */
interface CropmaskAPIResponse {
  /** Array of cropmask items. */
  results: Array<CropmaskResultItem>
  /** Allows for other top-level properties from the API (e.g., count, next, previous). */
  [key: string]: unknown
}

/**
 * Interface for the API response when fetching available products.
 */
interface ProductAPIResponse {
  /** Array of product items. */
  results: Array<productType>
  /** Optional count of total items, typical for paginated responses. */
  count?: number
  /** Optional URL for the next page of results. */
  next?: string | null
  /** Optional URL for the previous page of results. */
  previous?: string | null
  /** Allows for other top-level properties from the API. */
  [key: string]: unknown
}

/**
 * Defines the structure of the state for the availableDataStore.
 */
export type AvailableDataState = {
  /** Holds the list of available cropmasks. */
  cropmasks: CropmaskAPIResponse
  /** Holds the list of available products. */
  products: ProductAPIResponse
  /** Cache for product data to reduce API calls. */
  productCache: ProductAPIResponse | null
  /** Cache for cropmask data. */
  cropmaskCache: CropmaskAPIResponse | null
  /** Timestamp of the last product cache update. */
  productCacheTimestamp: number | null
  /** Timestamp of the last cropmask cache update. */
  cropmaskCacheTimestamp: number | null
  /** Stores error messages related to fetching data, if any. */
  error: string | null
}

/**
 * Cache duration set to 5 minutes (in milliseconds).
 */
const CACHE_DURATION = 5 * 60 * 1000

export const useAvailableDataStore = defineStore('availableDataStore', {
  state: (): AvailableDataState => ({
    cropmasks: { results: [] }, // Initialize with empty results array
    products: { results: [] }, // Initialize with empty results array
    productCache: null,
    cropmaskCache: null,
    productCacheTimestamp: null,
    cropmaskCacheTimestamp: null,
    error: null,
  }),
  getters: {
    /**
     * Retrieves the list of available cropmasks.
     * @param {AvailableDataState} state - The current store state.
     * @returns {Array<CropmaskResultItem>} The list of cropmasks.
     */
    getCropmasks(state): Array<CropmaskResultItem> {
      return state.cropmasks.results
    },
    /**
     * Retrieves the list of available products.
     * @param {AvailableDataState} state - The current store state.
     * @returns {Array<productType>} The list of products.
     */
    getProducts(state): Array<productType> {
      return state.products.results
    },
  },
  actions: {
    /**
     * Loads available products from the API or cache.
     * If cached data is available and not expired, it's used.
     * Otherwise, fetches fresh data from the API.
     */
    async loadAvailableProducts(): Promise<void> {
      const now = Date.now()
      // Check if valid cache exists
      if (
        this.productCache &&
        this.productCacheTimestamp &&
        now - this.productCacheTimestamp < CACHE_DURATION
      ) {
        // console.log('[availableDataStore]: Using cached products');
        this.products = this.productCache
        this.error = null // Clear any previous errors
        return
      }
      // console.log('[availableDataStore]: Fetching fresh products');
      try {
        const data: ProductAPIResponse = await fetchProductsApi()
        this.products = data
        this.productCache = data // Update cache
        this.productCacheTimestamp = now // Update cache timestamp
        this.error = null
      } catch (err) {
        console.error(
          '[availableDataStore] Failed to load available products:',
          err,
        )
        this.error =
          err instanceof Error
            ? err.message
            : 'An unknown error occurred while fetching products.'
        // Optionally, clear products or leave stale data. Current behavior: retains stale data if any.
        // To clear: this.products = { results: [] };
      }
    },

    /**
     * Loads available cropmasks from the API or cache.
     * If cached data is available and not expired, it's used.
     * Otherwise, fetches fresh data from the API.
     */
    async loadAvailableCropmasks(): Promise<void> {
      const now = Date.now()
      // Check if valid cache exists
      if (
        this.cropmaskCache &&
        this.cropmaskCacheTimestamp &&
        now - this.cropmaskCacheTimestamp < CACHE_DURATION
      ) {
        // console.log('[availableDataStore]: Using cached cropmasks');
        this.cropmasks = this.cropmaskCache
        this.error = null // Clear any previous errors
        return
      }
      // console.log('[availableDataStore]: Fetching fresh cropmasks');
      try {
        const data: CropmaskAPIResponse = await fetchCropmasksApi()
        this.cropmasks = data
        this.cropmaskCache = data // Update cache
        this.cropmaskCacheTimestamp = now // Update cache timestamp
        this.error = null
      } catch (err) {
        console.error(
          '[availableDataStore] Failed to load available cropmasks:',
          err,
        )
        this.error =
          err instanceof Error
            ? err.message
            : 'An unknown error occurred while fetching cropmasks.'
        // Optionally, clear cropmasks or leave stale data. Current behavior: retains stale data if any.
        // To clear: this.cropmasks = { results: [] };
      }
    },
  },
})
