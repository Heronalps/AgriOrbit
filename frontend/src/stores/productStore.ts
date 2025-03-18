// productStore.ts
import { getDatasetEntries } from "@/api/datasets"
import { getValueAtPoint } from "@/api/point"
import { computeTileLayerURL } from '@/api/tile'
import { defineStore } from 'pinia'
import { type ProductMeta } from "@/api.d.ts"; // Import ProductMeta

// Interface for entries in the productEntries.results array
export interface ProductListEntry {
  date: string; // Consistently used in getters
  // Add other known properties if available and used from productEntries.results
  [key: string]: unknown; // For any other properties not explicitly defined
}

export interface selectedProductType {
  product_id?: string;
  cropmask_id?: string;
  date?: string; // This is the selected date for the product_id
  previousProductId?: string; // Track product changes

  // Fields that might be populated from the general product definition (from api.d.ts -> productType)
  display_name?: string;
  desc?: string;
  meta?: ProductMeta;
  composite?: boolean;
  // Add other fields from api.d.ts -> productType if they are directly stored and used here

  [key: string]: unknown; // Replaced [key: string]: any;
}

export interface clickedPointType {
  value?: number | null;
  x?: number;
  y?: number;
  show?: boolean;
  [key: string]: unknown; // Replaced [key: string]: any;
}

export interface productState {
  selectedProduct: selectedProductType;
  productEntries: { results: ProductListEntry[] }; // Uses ProductListEntry
  clickedPoint: clickedPointType;
  isLoading: boolean;
  error: string | null;
}

export const useProductStore = defineStore('productStore', {
  state: () => ({
    selectedProduct: {} as selectedProductType,
    productEntries: { results: [] } as { results: ProductListEntry[] },
    clickedPoint: { show: false, value: null } as clickedPointType,
    isLoading: false,
    error: null,
  }) as productState,

  getters: {
    getSelectedProduct(state): selectedProductType {
      return state.selectedProduct;
    },
    getSelectedDate(state): string {
      return state.selectedProduct.date || '';
    },
    getProductDates(state): Array<string> { // Ensure return type is string array
      if (!state.productEntries || !state.productEntries.results) return [];
      return state.productEntries.results.map(el => {
        if (el.date) {
          return el.date.includes('-') ? el.date.replaceAll('-', '/') : el.date;
        }
        return '';
      }).filter(date => date);
    },
    isProductSelected(state): boolean {
      return !!state.selectedProduct.product_id;
    },
    getMostRecentDate(state): string | undefined {
      const dates = state.productEntries.results
        ?.map(el => el.date)
        .filter(Boolean)
        .sort(); // Sort dates to find the most recent
      return dates && dates.length > 0 ? dates[dates.length - 1].replaceAll('-', '/') : undefined;
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
      const currentProductId = this.selectedProduct.product_id;
      const currentPreviousProductId = this.selectedProduct.previousProductId;

      this.clickedPoint.show = false; // Hide clicked point info on product change

      if (currentProductId !== newProductId) {
        // --- Genuine Product Switch ---
        this.selectedProduct = {
          ...(this.selectedProduct), // Retain other properties like cropmask_id
          product_id: newProductId,
          previousProductId: currentProductId, // Store the product we are switching from
          date: undefined, // CRITICAL: Clear date, new product will need its own valid date
        };
        await this.loadProductEntries(true); // `productJustChanged` is true
      } else {
        // --- Product ID in State Already Matches newProductId ---
        if (currentPreviousProductId && currentPreviousProductId !== newProductId) {
          this.selectedProduct.date = undefined;
          await this.loadProductEntries(true); // Treat as a new product selection for date logic
        } else {
          if (!currentPreviousProductId && this.selectedProduct.date) {
            this.selectedProduct.date = undefined;
          }
          await this.loadProductEntries(false); // `productJustChanged` is false
        }
      }
    },

    /**
     * Sets the selected date for the current product and reloads entries if needed.
     */
    async setDate(newDateString: string | undefined) {
      if (this.selectedProduct.date !== newDateString) {
        this.selectedProduct.date = newDateString;
        if (this.selectedProduct.product_id) {
          await this.loadProductEntries(false);
        }
      }
    },

    /**
     * Sets the selected cropmask for the current product and reloads entries.
     */
    async setCropmask(newCropmaskId: string | undefined) {
      if (this.selectedProduct.cropmask_id !== newCropmaskId) {
        this.selectedProduct.cropmask_id = newCropmaskId;
        if (this.selectedProduct.product_id) {
          await this.loadProductEntries(false);
        }
      }
    },

    /**
     * Loads available data entries (e.g., dates) for the currently selected product and cropmask.
     * It also handles setting a valid date for the product if the current one is invalid or not set.
     * @param productJustChanged - True if this call is a direct result of the product ID changing.
     */
    async loadProductEntries(productJustChanged = false) {
      const currentProductId = this.selectedProduct.product_id;
      const currentCropmaskId = this.selectedProduct.cropmask_id;
      const initialDateInStateOnEntry = this.selectedProduct.date;

      this.isLoading = true;
      this.error = null;

      try {
        if (!currentProductId) {
          console.warn('loadProductEntries: No product selected, skipping data load.');
          this.productEntries = { results: [] };
          this.selectedProduct.date = undefined;
          this.isLoading = false;
          return;
        }

        const paramsForDatasetEntries: { product_id: string, cropmask_id?: string } = { product_id: currentProductId };
        if (currentCropmaskId) {
          paramsForDatasetEntries.cropmask_id = currentCropmaskId;
        }

        const data = await getDatasetEntries(paramsForDatasetEntries);
        this.productEntries = data || { results: [] };

        const availableDates = this.getProductDates;
        const mostRecentDate = this.getMostRecentDate;

        let dateToSetBasedOnLogic: string | undefined = this.selectedProduct.date;

        if (productJustChanged) {
          dateToSetBasedOnLogic = undefined;
        } else if (initialDateInStateOnEntry && availableDates.length > 0 && !availableDates.includes(initialDateInStateOnEntry)) {
          dateToSetBasedOnLogic = undefined;
        }

        if (availableDates.length > 0) {
          if (dateToSetBasedOnLogic === undefined || !availableDates.includes(dateToSetBasedOnLogic)) {
            this.selectedProduct.date = mostRecentDate;
          } else {
            this.selectedProduct.date = dateToSetBasedOnLogic;
          }
        } else {
          this.selectedProduct.date = undefined;
        }

      } catch (error: unknown) {
        console.error(`Error in loadProductEntries for product ${currentProductId}:`, error);
        if (error instanceof Error) {
          this.error = error.message;
        } else if (typeof error === 'string') {
          this.error = error;
        } else {
          this.error = 'Failed to load product entries';
        }
        this.productEntries = { results: [] };
        this.selectedProduct.date = undefined;
      } finally {
        this.isLoading = false;
      }
    },
    
    /**
     * Fetches the data value for the selected product at a given map coordinate.
     */
    async loadValueAtPoint(longitude: number, latitude: number) {
      this.clickedPoint.show = true;
      
      try {
        if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_USE_REAL_API) {
          const randomValue = parseFloat((Math.random() * 0.6 + 0.2).toFixed(2));
          this.clickedPoint = {
            value: randomValue,
            x: longitude,
            y: latitude,
            show: true
          };
          return;
        }
        
        const data = await getValueAtPoint(this.selectedProduct, longitude, latitude);
        this.clickedPoint = {
          ...this.clickedPoint,
          value: data?.value,
          x: longitude,
          y: latitude,
          show: true
        };
      } catch (error) {
        console.error('Error loading point value:', error);
        this.clickedPoint.value = null;
      }
    },

    /**
     * Computes the TileLayer URL for the current product and date.
     * Returns an empty string if essential parameters are missing.
     */
    getTileLayerURL(): string {
      if (!this.selectedProduct.product_id || !this.selectedProduct.date) {
        return ''; // Essential parameters missing
      }
      return computeTileLayerURL(this.selectedProduct);
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
          this.selectedProduct.cropmask_id // Pass cropmask_id if available
        );
        // console.log('Generated tile layer URL:', tileLayerUrl); // For debugging
        return tileLayerUrl;
      }
      // console.warn('renderTileLayer: Missing product_id or date, cannot generate URL.');
      return null;
    }
  },
})

// Export the type of the store instance
export type ProductStore = ReturnType<typeof useProductStore>;