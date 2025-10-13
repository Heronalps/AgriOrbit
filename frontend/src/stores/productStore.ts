// productStore.ts
import { getDatasetEntries } from '@/api/datasets'
import { computeTileLayerURL } from '@/api/tile'
import { defineStore } from 'pinia'
import type { ProductMeta } from '@/api.d.ts'
import { useAvailableDataStore } from './availableDataStore'
import type { SelectedProductParams } from '@/shared'

// Interface for entries in the productEntries.results array
export interface ProductListEntry {
  date: string // Consistently used in getters
  // Add other known properties if available and used from productEntries.results
  [key: string]: unknown // For any other properties not explicitly defined
}

export interface selectedProductType {
  product_id?: string
  cropmask_id?: string
  date?: string // This is the selected date for the product_id
  previousProductId?: string // Track product changes

  // Fields that might be populated from the general product definition (from api.d.ts -> productType)
  display_name?: string
  desc?: string
  meta?: ProductMeta
  composite?: boolean
  // Add other fields from api.d.ts -> productType if they are directly stored and used here

  [key: string]: unknown // Replaced [key: string]: any;
}

export interface productState {
  selectedProduct: selectedProductType
  productEntries: { results: ProductListEntry[] } // Uses ProductListEntry
  isLoading: boolean // For loading product entries, not point data
  error: string | null // For errors related to loading product entries
}

export const useProductStore = defineStore('productStore', {
  state: () =>
    ({
      selectedProduct: {} as selectedProductType,
      productEntries: { results: [] } as { results: ProductListEntry[] },
      isLoading: false, // This isLoading is for product entries
      error: null,
    }) as productState,

  getters: {
    getSelectedProduct(state): selectedProductType {
      return state.selectedProduct
    },
    getProductDates(state): Array<string> {
      // Ensure return type is string array
      if (!state.productEntries || !state.productEntries.results) return []
      return state.productEntries.results
        .map((el) => {
          if (el.date) {
            return el.date.includes('-')
              ? el.date.replaceAll('-', '/')
              : el.date
          }
          return ''
        })
        .filter((date) => date)
    },
    isProductSelected(state): boolean {
      return !!state.selectedProduct.product_id
    },
    getMostRecentDate(state): string | undefined {
      const dates = state.productEntries.results
        ?.map((el) => el.date)
        .filter(Boolean)
        .sort() // Sort dates to find the most recent
      return dates && dates.length > 0
        ? dates[dates.length - 1].replaceAll('-', '/')
        : undefined
    },
  },

  actions: {
    /**
     * Sets the active product. This action handles:
     * 1. Genuine product switches: Clears the date and loads entries for the new product.
     * 2. Product re-selections or state inconsistencies: Validates and potentially corrects
     *    the date if it appears stale due to the product ID already being set.
     */
    async setProduct(newProductId: string) {
      const currentProductId = this.selectedProduct.product_id

      if (currentProductId !== newProductId) {
        // --- Genuine Product Switch ---
        const availableDataStore = useAvailableDataStore()
        const fullProductDetails = availableDataStore.getProducts.find(
          (p) => p.product_id === newProductId,
        )

        this.selectedProduct = {
          ...this.selectedProduct, // Retain other properties like cropmask_id
          product_id: newProductId,
          previousProductId: currentProductId, // Store the product we are switching from
          date: undefined, // CRITICAL: Clear date, new product will need its own valid date
          // Populate from fullProductDetails
          display_name: fullProductDetails?.display_name,
          desc: fullProductDetails?.desc,
          meta: fullProductDetails?.meta,
          composite: fullProductDetails?.composite,
        }
        await this.loadProductEntries(true) // `productJustChanged` is true
      } else {
        // --- Product ID in State Already Matches newProductId ---
        // Ensure product details are loaded if they were somehow missing
        if (
          !this.selectedProduct.display_name ||
          !this.selectedProduct.desc ||
          !this.selectedProduct.meta
        ) {
          const availableDataStore = useAvailableDataStore()
          const fullProductDetails = availableDataStore.getProducts.find(
            (p) => p.product_id === newProductId,
          )
          if (fullProductDetails) {
            this.selectedProduct.display_name = fullProductDetails.display_name
            this.selectedProduct.desc = fullProductDetails.desc
            this.selectedProduct.meta = fullProductDetails.meta
            this.selectedProduct.composite = fullProductDetails.composite
          }
        }

        const currentPreviousProductId = this.selectedProduct.previousProductId
        if (
          currentPreviousProductId &&
          currentPreviousProductId !== newProductId
        ) {
          // Switched away and then quickly back to this product
          this.selectedProduct.date = undefined
          await this.loadProductEntries(true) // Treat as a new product selection for date logic
        } else {
          // Product re-selected or refreshed.
          // loadProductEntries will handle date validation/setting.
          // If date is undefined, loadProductEntries(true) will pick a default.
          // Otherwise, loadProductEntries(false) will try to use/validate existing date.
          if (!this.selectedProduct.date) {
            await this.loadProductEntries(true)
          } else {
            await this.loadProductEntries(false)
          }
        }
      }
    },

    /**
     * Sets the selected date for the current product and reloads entries if needed.
     */
    async setDate(newDateString: string | undefined) {
      if (this.selectedProduct.date !== newDateString) {
        this.selectedProduct.date = newDateString
        if (this.selectedProduct.product_id) {
          await this.loadProductEntries(false)
        }
      }
    },

    /**
     * Sets the selected cropmask for the current product and reloads entries.
     */
    async setCropmask(newCropmaskId: string | undefined) {
      if (this.selectedProduct.cropmask_id !== newCropmaskId) {
        this.selectedProduct.cropmask_id = newCropmaskId
        if (this.selectedProduct.product_id) {
          await this.loadProductEntries(false)
        }
      }
    },

    /**
     * Loads available data entries (e.g., dates) for the currently selected product and cropmask.
     * It also handles setting a valid date for the product if the current one is invalid or not set.
     * @param productJustChanged - True if this call is a direct result of the product ID changing.
     */
    async loadProductEntries(productJustChanged = false) {
      const currentProductId = this.selectedProduct.product_id
      const currentCropmaskId = this.selectedProduct.cropmask_id
      const initialDateInStateOnEntry = this.selectedProduct.date

      this.isLoading = true // isLoading for product entries
      this.error = null // error for product entries

      try {
        if (!currentProductId) {
          console.warn(
            'loadProductEntries: No product selected, skipping data load.',
          )
          this.productEntries = { results: [] }
          this.selectedProduct.date = undefined
          this.isLoading = false
          return
        }

        // Construct paramsForDatasetEntries with the required 'date' property.
        const paramsForDatasetEntries: SelectedProductParams = {
          product_id: currentProductId,
          date: '', // Provide an empty string as a placeholder for date
        }
        if (currentCropmaskId) {
          paramsForDatasetEntries.cropmask_id = currentCropmaskId
        }

        const data = await getDatasetEntries(paramsForDatasetEntries)
        this.productEntries = data || { results: [] }

        const availableDates = this.getProductDates
        const mostRecentDate = this.getMostRecentDate

        let dateToSetBasedOnLogic: string | undefined =
          this.selectedProduct.date

        if (productJustChanged) {
          dateToSetBasedOnLogic = undefined
        } else if (
          initialDateInStateOnEntry &&
          availableDates.length > 0 &&
          !availableDates.includes(initialDateInStateOnEntry)
        ) {
          dateToSetBasedOnLogic = undefined
        }

        if (availableDates.length > 0) {
          if (
            dateToSetBasedOnLogic === undefined ||
            !availableDates.includes(dateToSetBasedOnLogic)
          ) {
            this.selectedProduct.date = mostRecentDate
          } else {
            this.selectedProduct.date = dateToSetBasedOnLogic
          }
        } else {
          this.selectedProduct.date = undefined
        }
      } catch (error: unknown) {
        console.error(
          `Error in loadProductEntries for product ${currentProductId}:`,
          error,
        )
        if (error instanceof Error) {
          this.error = error.message
        } else if (typeof error === 'string') {
          this.error = error
        } else {
          this.error = 'Failed to load product entries'
        }
        this.productEntries = { results: [] }
        this.selectedProduct.date = undefined
      } finally {
        this.isLoading = false // isLoading for product entries
      }
    },

    /**
     * Computes the TileLayer URL for the current product and date.
     * Returns null if essential parameters are missing.
     */
    getTileLayerURL(): string | null {
      if (!this.selectedProduct.product_id || !this.selectedProduct.date) {
        return null // Essential parameters missing
      }
      return computeTileLayerURL(this.selectedProduct as SelectedProductParams)
    },
  },
})

// Export the type of the store instance
export type ProductStore = ReturnType<typeof useProductStore>
