// productStore.ts
import { getDatasetEntries } from "@/api/datasets"
import { getValueAtPoint } from "@/api/point"
import { computeTileLayerURL } from '@/api/tile'
import { defineStore } from 'pinia'

export interface selectedProductType {
  product_id?: string;
  cropmask_id?: string;
  date?: string;
  previousProductId?: string; // Track product changes
  [key: string]: any;
}

export interface clickedPointType {
  value?: number | null;
  x?: number;
  y?: number;
  show?: boolean;
  [key: string]: any;
}

export type selectedProductInterface = selectedProductType

export interface productState {
  selectedProduct: selectedProductType;
  productEntries: { results: Array<any> };
  clickedPoint: clickedPointType;
  isLoading: boolean;
  error: string | null;
}

export const useProductStore = defineStore('productStore', {
  state: () => ({
    selectedProduct: {} as selectedProductType,
    productEntries: { results: [] } as any, // Ensure productEntries is an object with a results array
    clickedPoint: { show: false, value: null } as clickedPointType,
    isLoading: false,
    error: null
  }) as productState,

  getters: {
    getSelectedProduct(state): selectedProductInterface {
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
        console.log(`Product ${newProductId} re-selected. Reloading entries to ensure date validity.`);
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

    async loadProductEntries(productJustChanged: boolean = false) {
      console.log(`Loading product entries for:`, JSON.parse(JSON.stringify(this.selectedProduct)), `productJustChanged: ${productJustChanged}`);

      const currentProductId = this.selectedProduct.product_id;
      const currentCropmaskId = this.selectedProduct.cropmask_id;

      this.isLoading = true;
      this.error = null;

      if (productJustChanged) {
        console.log(`loadProductEntries: productJustChanged is true. Clearing selectedProduct.date.`);
        this.selectedProduct.date = undefined;
      }

      try {
        if (!currentProductId) {
          console.warn('No product selected, skipping data load');
          this.productEntries = { results: [] };
          this.selectedProduct.date = undefined;
          this.selectedProduct.previousProductId = undefined; // Clear previous product ID as well
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

        const availableDates = this.getProductDates; // Use getter
        const mostRecentDate = this.getMostRecentDate; // Use getter

        if (availableDates.length > 0) {
          if (this.selectedProduct.date === undefined || !availableDates.includes(this.selectedProduct.date)) {
            if (this.selectedProduct.date !== undefined && !availableDates.includes(this.selectedProduct.date)) {
              console.warn(`Previously selected date ${this.selectedProduct.date} no longer available. Setting to most recent: ${mostRecentDate}.`);
            } else {
              console.log(`Setting date to most recent available: ${mostRecentDate}`);
            }
            this.selectedProduct.date = mostRecentDate;
          } else {
            console.log(`Keeping existing valid date: ${this.selectedProduct.date}`);
          }
        } else {
          console.warn(`No dates available for product ${currentProductId}. Clearing selectedProduct.date.`);
          this.selectedProduct.date = undefined;
        }

        this.selectedProduct.previousProductId = currentProductId;

      } catch (error: any) {
        console.error(`Error in loadProductEntries for product ${currentProductId}:`, error);
        this.error = error.message || 'Failed to load product entries';
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