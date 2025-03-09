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
    // getTileLayerURL was moved back to actions
  },

  actions: {
    async setProduct(newProductId: string) {
      const currentProductIdInStateAtEntry = this.selectedProduct.product_id;
      const currentDateInStateAtEntry = this.selectedProduct.date; // For logging/decision
      const currentPreviousProductIdAtEntry = this.selectedProduct.previousProductId;

      this.clickedPoint.show = false;

      if (currentProductIdInStateAtEntry !== newProductId) {
        // Genuine switch from a different product
        console.log(`setProduct: Switching from '${currentProductIdInStateAtEntry || 'undefined'}' to '${newProductId}'.`);
        this.selectedProduct = {
          ...(this.selectedProduct), 
          product_id: newProductId,
          previousProductId: currentProductIdInStateAtEntry, 
          date: undefined, // CRITICAL: Clear date
        };
        await this.loadProductEntries(true); 
      } else { 
        // newProductId is the same as product_id in state at entry.
        console.log(`setProduct: Product '${newProductId}' is already set in state. Validating/refreshing.`);

        if (currentPreviousProductIdAtEntry && currentPreviousProductIdAtEntry !== newProductId) {
          // Case 1: product_id=B (newProductId), currentPreviousProductIdAtEntry=A. 
          // This implies a recent switch from A to B, and currentDateInStateAtEntry might be stale from A.
          console.warn(`setProduct: Product is ${newProductId}, but previousProductId is ${currentPreviousProductIdAtEntry}. Date ${currentDateInStateAtEntry} is likely stale. Clearing date.`);
          this.selectedProduct.date = undefined; // Synchronous clear
          await this.loadProductEntries(true); // Reload as if product just changed for newProductId
        } else {
          // Case 2: currentPreviousProductIdAtEntry is undefined OR currentPreviousProductIdAtEntry IS newProductId.
          // This is the path indicated by logs for the error when switching to copernicus-swi.
          // (P:copernicus-swi, D:date_chirps, PP:undefined) -> setProduct('copernicus-swi')
          
          // If previousProductId is undefined AND a date is currently set in state,
          // this date is highly suspect if product_id was set externally before this action was called.
          if (!currentPreviousProductIdAtEntry && this.selectedProduct.date) {
            console.warn(`setProduct: Product is ${newProductId}, previousProductId is undefined, but a date ${this.selectedProduct.date} exists. This date might be stale from an external product_id update. Clearing date synchronously.`);
            this.selectedProduct.date = undefined; // Synchronous clear to prevent stale URL generation
          }
          // Now, this.selectedProduct.date is either undefined (if cleared above or was already) or was the existing date.
          // loadProductEntries(false) will handle finding the most recent if date is undefined, or validating it.
          console.log(`setProduct: Proceeding with loadProductEntries(false) for '${newProductId}'. Current date in state before call: ${this.selectedProduct.date}.`);
          await this.loadProductEntries(false);
        }
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
      console.log(`Loading product entries for:`, JSON.parse(JSON.stringify(this.selectedProduct)), `productJustChanged: ${productJustChanged}`);

      const currentProductId = this.selectedProduct.product_id;
      const currentCropmaskId = this.selectedProduct.cropmask_id;
      const initialDateInState = this.selectedProduct.date; // Capture the date as it was when function was called

      this.isLoading = true;
      this.error = null;

      try {
        if (!currentProductId) {
          console.warn('No product selected, skipping data load');
          this.productEntries = { results: [] };
          this.selectedProduct.date = undefined;
          this.isLoading = false;
          return;
        }

        const paramsForDatasetEntries: { product_id: string, cropmask_id?: string } = { product_id: currentProductId };
        if (currentCropmaskId) {
          paramsForDatasetEntries.cropmask_id = currentCropmaskId;
        }
        console.log('Fetching dataset entries with params:', JSON.parse(JSON.stringify(paramsForDatasetEntries)));

        const data = await getDatasetEntries(paramsForDatasetEntries);
        this.productEntries = data || { results: [] };

        const availableDates = this.getProductDates; // Getter uses this.productEntries
        const mostRecentDate = this.getMostRecentDate; // Getter

        let dateToSet: string | undefined = this.selectedProduct.date; // Start with current date in state

        if (productJustChanged) {
          console.log(`loadProductEntries: productJustChanged is true. Clearing date.`);
          dateToSet = undefined;
        } else if (initialDateInState && availableDates.length > 0 && !availableDates.includes(initialDateInState)) {
          console.warn(`loadProductEntries: Date ${initialDateInState} for product ${currentProductId} is invalid despite productJustChanged=false. Clearing date.`);
          dateToSet = undefined; // Stale date detected, clear it
        }
        // If !productJustChanged and initialDateInState is valid or null, dateToSet remains initialDateInState

        // Now, determine the final date based on availability
        if (availableDates.length > 0) {
          if (dateToSet === undefined || !availableDates.includes(dateToSet)) {
            if (dateToSet !== undefined) { // It was defined but invalid or cleared due to staleness
              console.warn(`Previously selected date ${dateToSet} (or initial ${initialDateInState}) no longer available or was stale. Setting to most recent: ${mostRecentDate}.`);
            } else {
              console.log(`Setting date to most recent available: ${mostRecentDate}`);
            }
            this.selectedProduct.date = mostRecentDate;
          } else {
            // dateToSet is valid and was not cleared
            console.log(`Keeping existing valid date: ${dateToSet}`);
            this.selectedProduct.date = dateToSet; // Explicitly set, though it might be the same
          }
        } else {
          console.warn(`No dates available for product ${currentProductId}. Clearing selectedProduct.date.`);
          this.selectedProduct.date = undefined;
        }

      } catch (error: unknown) { // Changed from any to unknown
        console.error(`Error in loadProductEntries for product ${currentProductId}:`, error);
        if (error instanceof Error) {
          this.error = error.message;
        } else if (typeof error === 'string') {
          this.error = error;
        } else {
          this.error = 'Failed to load product entries';
        }
        this.productEntries = { results: [] }; // Reset on error
        this.selectedProduct.date = undefined; // Reset date on error
      } finally {
        this.isLoading = false;
      }
    },
    
    async loadValueAtPoint(longitude, latitude) {
      console.log(`Loading value at point: ${longitude}, ${latitude} for product:`, this.selectedProduct);
      this.clickedPoint.show = true;
      
      try {
        if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_USE_REAL_API) {
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
      // Ensure computeTileLayerURL is imported and used correctly
      return computeTileLayerURL(this.selectedProduct);
    }
  },
})

// Export the type of the store instance
export type ProductStore = ReturnType<typeof useProductStore>;