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

export interface selectedProductInterface extends selectedProductType {}

export interface productState {
  selectedProduct: selectedProductType;
  productEntries: Array<any>;
  clickedPoint: clickedPointType;
  isLoading: boolean;
  error: string | null;
}

export const useProductStore = defineStore('productStore', {
  state: () => ({
    selectedProduct: {},
    productEntries: [],
    clickedPoint: { show: false, value: null },
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
    getProductDates(state): Array<any> {
      if (!state.productEntries.results) return [];

      // Handle date format correctly
      return state.productEntries.results.map(el => {
        // Make sure date is in the right format for the datepicker
        if (el.date) {
          // Handle dates in different formats
          const date = el.date.includes('-') 
            ? el.date.replaceAll('-', '/') 
            : el.date;
          return date;
        }
        return '';
      }).filter(date => date); // Filter out empty dates
    },
    isProductSelected(state): boolean {
      return !!state.selectedProduct.product_id;
    },
    getMostRecentDate(state): string | undefined {
      if (!state.productEntries.results || state.productEntries.results.length === 0) {
        return undefined;
      }
      // Get the last date in the array, which should be the most recent
      const dates = this.getProductDates;
      return dates.length > 0 ? dates[dates.length - 1] : undefined;
    },
  },

  actions: {
    async loadProductEntries() {
      console.log('Loading product entries for:', this.selectedProduct);
      this.isLoading = true;
      this.error = null;
      
      try {
        // Check if we have a product selected
        if (!this.selectedProduct.product_id) {
          console.warn('No product selected, skipping data load');
          this.productEntries = [];
          return;
        }

        const data = await getDatasetEntries(this.selectedProduct);
        this.productEntries = data || { results: [] };
        
        const productChanged = this.selectedProduct.previousProductId !== this.selectedProduct.product_id;
        
        // Always set to the most recent date when product changes or no date is selected
        if (this.getProductDates.length > 0 && (productChanged || !this.selectedProduct.date)) {
          const mostRecentDate = this.getMostRecentDate;
          console.log('Setting date to most recent:', mostRecentDate);
          this.selectedProduct.date = mostRecentDate;
        }
        
        // Update the previous product ID to track changes
        this.selectedProduct.previousProductId = this.selectedProduct.product_id;
      } catch (error) {
        console.error('Error in loadProductEntries:', error);
        this.error = 'Failed to load product entries';
        this.productEntries = [];
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
      if (!this.selectedProduct || !this.selectedProduct.product_id) {
        console.warn('Cannot generate tile URL: No product selected');
        return '';
      }
      return computeTileLayerURL(this.selectedProduct);
    }
  },
})