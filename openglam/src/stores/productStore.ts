// productStore.ts
import { getDatasetEntries } from "@/api/datasets"
import { getValueAtPoint } from "@/api/point"
import { computeTileLayerURL } from '@/api/tile'
import { defineStore } from 'pinia'

type selectedProductType = {
  date?: string;
  // Add other properties as needed
}

type clickedPointType = {
  value: number | null;
  show: boolean;
  longitude: number;
  latitude: number;
}

type targetLocationType = {
  longitude: number;
  latitude: number;
} | null

export interface productState {
  selectedProduct: selectedProductType;
  productEntries: Array<any>;
  clickedPoint: clickedPointType;
  targetLocation: targetLocationType;
}

export const useProductStore = defineStore('productStore', {
  state: () => ({
    selectedProduct: {},
    productEntries: [],
    clickedPoint: {
      value: null,
      show: false,
      longitude: 0,
      latitude: 0
    },
    targetLocation: null
  }) as productState,

  getters: {
    getSelectedProduct(state): selectedProductType {
      return state.selectedProduct
    },
    getSelectedDate(state): string | undefined {
      return state.selectedProduct.date
    },
    getProductDates(state): Array<string> {
      if (!state.productEntries || !Array.isArray(state.productEntries)) return []

      return state.productEntries
        .map(el => el.date)
        .map(el => el.replaceAll('-', '/'))
    },
  },

  actions: {
    async loadProductEntries() {
      const data = await getDatasetEntries(this.selectedProduct)
      this.productEntries = data
      if (this.getProductDates.length > 0) {
        this.selectedProduct.date = this.getProductDates[this.getProductDates.length - 1]
      }
    },

    async loadValueAtPoint(longitude: number, latitude: number) {
      const data = await getValueAtPoint(this.selectedProduct, longitude, latitude)
      if (this.clickedPoint) {
        this.clickedPoint = {
          value: data.value,
          show: true,
          longitude,
          latitude
        }
      }
    },

    getTileLayerURL() {
      return computeTileLayerURL(this.selectedProduct)
    },

    setTargetLocation(location: targetLocationType) {
      this.targetLocation = location;
    },

    clearTargetLocation() {
      this.targetLocation = null;
    },

    getTargetLocation(): targetLocationType {
      return this.targetLocation;
    },

    setClickedPoint(point: clickedPointType) {
      this.clickedPoint = point
    },

    hideClickedPoint() {
      this.clickedPoint.show = false
    }
  },
})