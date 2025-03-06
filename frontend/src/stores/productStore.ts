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
    productEntries: { results: [] } as { results: ProductListEntry[] }, // Typed assertion
    clickedPoint: { show: false, value: null } as clickedPointType,
    isLoading: false,
    error: null
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
    async setProduct(newProductId: string) {
      this.clickedPoint.show = false;

      if (this.selectedProduct.product_id !== newProductId) {
        console.log(`Setting product to: ${newProductId}. Storing old product ID '${this.selectedProduct.product_id}' as previous.`);
        this.selectedProduct.previousProductId = this.selectedProduct.product_id;
        this.selectedProduct.product_id = newProductId;
        // Date will be cleared by loadProductEntries via the flag
        await this.loadProductEntries(true); // Pass true for productJustChanged
      } else {
        await this.loadProductEntries(false); // Pass false or omit (as it defaults to false)
      }
    },

    async setDate(newDateString: string | undefined) {
      if (this.selectedProduct.date !== newDateString) {
        console.log(`Setting date to: ${newDateString}`);
        this.selectedProduct.date = newDateString;
        if (this.selectedProduct.product_id) {
          await this.loadProductEntries(false); // Pass false
        }
      }
    },

    async setCropmask(newCropmaskId: string | undefined) {
      if (this.selectedProduct.cropmask_id !== newCropmaskId) {
        this.selectedProduct.cropmask_id = newCropmaskId;
        if (this.selectedProduct.product_id) {
          await this.loadProductEntries(false); // Pass false
        }
      }
    },

    async loadProductEntries(productJustChanged = false) {
      const currentProductId = this.selectedProduct.product_id;
      const currentCropmaskId = this.selectedProduct.cropmask_id;

      this.isLoading = true;
      this.error = null;

      try {
        if (!currentProductId) {
          console.warn('No product selected, skipping data load');
          this.productEntries = { results: [] };
          this.selectedProduct.date = undefined;
          return;
        }

        const paramsForDatasetEntries = { product_id: currentProductId, cropmask_id: currentCropmaskId };

        const data = await getDatasetEntries(paramsForDatasetEntries);
        this.productEntries = data || { results: [] };

        const availableDates = this.getProductDates;
        const mostRecentDate = this.getMostRecentDate;

        if (availableDates.length > 0) {
          if (productJustChanged) {
            console.log(`Product just changed. Validating selected date: ${this.selectedProduct.date}`);
            if (!this.selectedProduct.date || !availableDates.includes(this.selectedProduct.date)) {
              console.warn(`Selected date ${this.selectedProduct.date} is invalid. Setting to most recent: ${mostRecentDate}`);
              this.selectedProduct.date = mostRecentDate;
            } else {
              console.log(`Keeping existing valid date: ${this.selectedProduct.date}`);
            }
          }
        } else {
          console.warn(`No dates available for product ${currentProductId}. Clearing selectedProduct.date.`);
          this.selectedProduct.date = undefined;
        }
      } catch (error) {
        console.error(`Error in loadProductEntries for product ${currentProductId}:`, error);
        this.error = error instanceof Error ? error.message : 'Failed to load product entries';
        this.productEntries = { results: [] };
        this.selectedProduct.date = undefined;
      } finally {
        this.isLoading = false;
      }
    },
    
    async loadValueAtPoint(longitude, latitude) {
      console.log(`Loading value at point: ${longitude}, ${latitude} for product:`, this.selectedProduct);
      this.clickedPoint.show = true;
      
      try {
        // For development/testing when API might not be available
        if (process.env.NODE_ENV === 'development' && !import.meta.env.VITE_USE_REAL_API) {
          // Generate a random value for demonstration
          const randomValue = parseFloat((Math.random() * 0.6 + 0.2).toFixed(2));
          console.log('Using mock value:', randomValue);
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
    
    getTileLayerURL() {
      if (!this.selectedProduct || !this.selectedProduct.product_id || !this.selectedProduct.date) {
        return '';
      }
      return computeTileLayerURL(this.selectedProduct);
    }
  },
})

// Export the type of the store instance
export type ProductStore = ReturnType<typeof useProductStore>;