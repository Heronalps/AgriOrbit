// productStore.ts
import { getDatasetEntries } from '@/api/datasets'
import { computeTileLayerURL } from '@/api/tile'
import { defineStore } from 'pinia'
import type { ProductMeta } from '@/api.d.ts'
import { useAvailableDataStore } from './availableDataStore'
import { queryValueByGeometry } from '../api/query'
import type { ApiGeomType } from '../api/query'

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

export interface clickedPointType {
  value?: number | null
  x?: number
  y?: number
  show?: boolean
  longitude?: number
  latitude?: number
  isLoading?: boolean
  errorMessage?: string | null
  [key: string]: unknown // Replaced [key: string]: any;
}

export interface productState {
  selectedProduct: selectedProductType
  productEntries: { results: ProductListEntry[] } // Uses ProductListEntry
  clickedPoint: clickedPointType
  isLoading: boolean
  error: string | null
  currentMapSelectionCoordinates: { longitude: number; latitude: number } | null // New state for pinned point
}

export const useProductStore = defineStore('productStore', {
  state: () =>
    ({
      selectedProduct: {} as selectedProductType,
      productEntries: { results: [] } as { results: ProductListEntry[] },
      clickedPoint: { show: false, value: null } as clickedPointType,
      isLoading: false,
      error: null,
      currentMapSelectionCoordinates: null, // Initialize new state
    }) as productState,

  getters: {
    getSelectedProduct(state): selectedProductType {
      return state.selectedProduct
    },
    getSelectedDate(state): string {
      return state.selectedProduct.date || ''
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
      this.clickedPoint.show = false // Hide clicked point info on product change

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

      this.isLoading = true
      this.error = null

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

        const paramsForDatasetEntries: {
          product_id: string
          cropmask_id?: string
        } = { product_id: currentProductId }
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
        this.isLoading = false
      }
    },

    /**
     * Sets the current map selection coordinates, used for the "pinned" point.
     * The reactive loader will pick up this change to fetch data.
     */
    setCurrentMapSelectionCoordinates(longitude: number, latitude: number) {
      this.currentMapSelectionCoordinates = { longitude, latitude }
      console.log(
        '[productStore] currentMapSelectionCoordinates updated:',
        JSON.parse(JSON.stringify(this.currentMapSelectionCoordinates)),
      )
    },

    /**
     * Fetches the data value for the selected product at a given map coordinate using a polygon.
     */
    async loadDataForClickedPointViaPolygon(
      longitude: number,
      latitude: number,
    ) {
      console.log(
        `[productStore] loadDataForClickedPointViaPolygon called for Lon: ${longitude}, Lat: ${latitude}. Current product: ${this.selectedProduct.product_id}, Date: ${this.selectedProduct.date}`,
      )
      if (!this.selectedProduct.product_id) {
        console.warn(
          '[productStore] loadDataForClickedPointViaPolygon: No product selected.',
        )
        this.clickedPoint = {
          ...this.clickedPoint,
          value: null,
          show: true, // Show popup to display the message
          isLoading: false,
          errorMessage:
            'Please select a product layer to get data for a point.',
          longitude,
          latitude,
        }
        console.log(
          '[productStore] clickedPoint updated (no product):',
          JSON.parse(JSON.stringify(this.clickedPoint)),
        )
        return
      }

      this.clickedPoint = {
        ...this.clickedPoint, // Preserve x, y screen coords if already set
        value: null,
        show: false, // Initially false, will be true when data arrives or error occurs
        isLoading: true,
        errorMessage: null,
        longitude,
        latitude,
      }
      // console.log('[productStore] clickedPoint set for loading:', JSON.parse(JSON.stringify(this.clickedPoint))); // Optional: log initial set for loading

      try {
        const { product_id, date, cropmask_id, ...otherProductParams } =
          this.selectedProduct
        const polygon: ApiGeomType = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [longitude - 0.0001, latitude - 0.0001],
                [longitude + 0.0001, latitude - 0.0001],
                [longitude + 0.0001, latitude + 0.0001],
                [longitude - 0.0001, latitude + 0.0001],
                [longitude - 0.0001, latitude - 0.0001],
              ],
            ],
          },
        }

        const response = await queryValueByGeometry(
          {
            product_id,
            date,
            cropmask_id: cropmask_id || 'no-mask', // Ensure cropmask_id defaults to 'no-mask' if undefined
            ...otherProductParams, // Include any other relevant parameters from selectedProduct
          },
          polygon,
        )

        let extractedValue: number | null = null
        let friendlyMessage: string | null = null

        if (typeof response === 'number') {
          extractedValue = response
        } else if (response && typeof response === 'object') {
          if (typeof response.mean === 'number') {
            extractedValue = response.mean
          } else if (typeof response.value === 'number') {
            extractedValue = response.value
          } else if (response.features && response.features[0]?.properties) {
            const props = response.features[0].properties
            if (typeof props.mean === 'number') extractedValue = props.mean
            else if (typeof props.value === 'number')
              extractedValue = props.value
            else {
              const numericProps = Object.values(props).filter(
                (v) => typeof v === 'number',
              )
              if (numericProps.length === 1)
                extractedValue = numericProps[0] as number
              else if (numericProps.length > 1)
                friendlyMessage =
                  'Multiple numeric properties found; unable to determine primary value.'
              else
                friendlyMessage =
                  'No numeric value found in feature properties.'
            }
          } else {
            friendlyMessage =
              'Response format not recognized or no value found.'
          }
        } else {
          friendlyMessage = 'Received unexpected data type from API.'
        }

        if (extractedValue !== null) {
          this.clickedPoint = {
            ...this.clickedPoint,
            value: extractedValue,
            show: true,
            isLoading: false,
            errorMessage: null,
          }
          console.log(
            '[productStore] clickedPoint updated (success):',
            JSON.parse(JSON.stringify(this.clickedPoint)),
          )
        } else {
          this.clickedPoint = {
            ...this.clickedPoint,
            value: null,
            show: true,
            isLoading: false,
            errorMessage:
              friendlyMessage ||
              'Failed to extract a valid number from the response.',
          }
          console.log(
            '[productStore] clickedPoint updated (error/no value):',
            JSON.parse(JSON.stringify(this.clickedPoint)),
          )
        }
      } catch (caughtError: unknown) {
        console.error('Error loading value at point:', caughtError)
        let errorMessage = 'Failed to load data for the point.'

        // Asserting the type of caughtError to allow property access
        // This assumes the error object might have 'response.data.detail' or 'message'
        const errorDetails = caughtError as {
          response?: { data?: { detail?: string } }
          message?: string
        }

        if (
          errorDetails.response &&
          errorDetails.response.data &&
          typeof errorDetails.response.data.detail === 'string'
        ) {
          errorMessage = errorDetails.response.data.detail
        } else if (typeof errorDetails.message === 'string') {
          errorMessage = errorDetails.message
        }
        this.clickedPoint = {
          ...this.clickedPoint,
          value: null,
          show: true,
          isLoading: false,
          errorMessage: errorMessage,
        }
        console.log(
          '[productStore] clickedPoint updated (exception):',
          JSON.parse(JSON.stringify(this.clickedPoint)),
        )
      }
    },

    /**
     * Computes the TileLayer URL for the current product and date.
     * Returns an empty string if essential parameters are missing.
     */
    getTileLayerURL(): string {
      if (!this.selectedProduct.product_id || !this.selectedProduct.date) {
        return '' // Essential parameters missing
      }
      return computeTileLayerURL(this.selectedProduct)
    },

    /**
     * Generates and returns the tile layer URL for the current product and date.
     * This would typically be used by a map component to display the product data.
     * @returns {string | null} The tile layer URL or null if data is missing.
     */
    renderTileLayer(): string | null {
      if (this.selectedProduct.product_id && this.selectedProduct.date) {
        const tileLayerUrl = computeTileLayerURL(
          this.selectedProduct.product_id,
          this.selectedProduct.date,
          this.selectedProduct.cropmask_id, // Pass cropmask_id if available
        )
        return tileLayerUrl
      }
      return null
    },
  },
})

// Export the type of the store instance
export type ProductStore = ReturnType<typeof useProductStore>
