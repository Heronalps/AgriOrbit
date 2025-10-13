import { defineStore } from 'pinia'
import { queryValueByGeometry } from '@/api/query'
import type { ApiGeomType } from '@/api/query'
import type { ClickedPointType } from '@/shared.d.ts' // Assuming shared.d.ts is updated
import { useProductStore } from './productStore' // To access selected product details

export interface PointDataState {
  clickedPoint: ClickedPointType
}

export const usePointDataStore = defineStore('pointDataStore', {
  state: (): PointDataState => ({
    clickedPoint: {
      show: false,
      value: null,
      isLoading: false,
      errorMessage: null,
    } as ClickedPointType,
  }),

  actions: {
    /**
     * Fetches the data value for the selected product at given geographical coordinates using a polygon.
     * Updates the clickedPoint state with the fetched value or an error message.
     * @param longitude - Geographical longitude of the point of interest.
     * @param latitude - Geographical latitude of the point of interest.
     */
    async loadDataForClickedPoint(longitude: number, latitude: number) {
      const productStore = useProductStore()
      const selectedProduct = productStore.getSelectedProduct

      // console.log(`[pointDataStore] loadDataForClickedPoint called for Lon: ${longitude}, Lat: ${latitude}. Current product: ${selectedProduct.product_id}, Date: ${selectedProduct.date}`);

      if (!selectedProduct.product_id || !selectedProduct.date) {
        // console.warn('[pointDataStore] loadDataForClickedPoint: No product or date selected.');
        this.clickedPoint = {
          ...this.clickedPoint,
          longitude, // Keep the coordinates of the click
          latitude,
          value: null,
          show: true,
          isLoading: false,
          errorMessage:
            'Please select a product and date to get data for a point.',
        }
        return
      }

      this.clickedPoint = {
        ...this.clickedPoint, // Preserve screen x, y if already set
        longitude,
        latitude,
        value: null,
        show: true, // Show popup during loading
        isLoading: true,
        errorMessage: null,
      }

      try {
        const { product_id, date, cropmask_id, ...otherProductParams } =
          selectedProduct
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
            cropmask_id: cropmask_id || undefined, // Pass undefined if no cropmask
            ...otherProductParams,
          },
          polygon,
        )

        let extractedValue: number | null = null
        let friendlyMessage: string | null = null

        if (typeof response === 'number') {
          extractedValue = response
        } else if (response && typeof response === 'object') {
          // Attempt to extract value from common structures
          if (
            typeof (response as unknown as { mean: number }).mean === 'number'
          ) {
            extractedValue = (response as unknown as { mean: number }).mean
          } else if (
            typeof (response as unknown as { value: number }).value === 'number'
          ) {
            extractedValue = (response as unknown as { value: number }).value
          } else if (
            (
              response as unknown as {
                features: { properties: Record<string, unknown> }[]
              }
            ).features &&
            (
              response as unknown as {
                features: { properties: Record<string, unknown> }[]
              }
            ).features[0]?.properties
          ) {
            const props = (
              response as unknown as {
                features: { properties: Record<string, unknown> }[]
              }
            ).features[0].properties
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
            isLoading: false,
            errorMessage: null,
          }
        } else {
          this.clickedPoint = {
            ...this.clickedPoint,
            value: null,
            isLoading: false,
            errorMessage:
              friendlyMessage ||
              'Failed to extract a valid number from the response.',
          }
        }
      } catch (caughtError: unknown) {
        // console.error('[pointDataStore] Error loading value at point:', caughtError);
        let errorMessage = 'Failed to load data for the point.'
        const errorDetails = caughtError as {
          response?: { data?: { detail?: string } }
          message?: string
        }
        if (errorDetails.response?.data?.detail) {
          errorMessage = errorDetails.response.data.detail
        } else if (errorDetails.message) {
          errorMessage = errorDetails.message
        }
        this.clickedPoint = {
          ...this.clickedPoint,
          value: null,
          isLoading: false,
          errorMessage: errorMessage,
        }
      }
    },
  },
})

// Export the type of the store instance
export type PointDataStore = ReturnType<typeof usePointDataStore>
