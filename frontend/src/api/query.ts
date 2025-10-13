import axios from '@/http-common'
import type { SelectedProductParams, ApiGeomType } from '@/shared'

export type { ApiGeomType }
import { isAxiosError } from 'axios'

// GeoJSON type definitions are now in shared.d.ts

interface QueryPayload {
  product_id: string
  date: string // Expected in YYYY-MM-DD format
  geom: ApiGeomType
  cropmask_id?: string
  // anomaly?: string; // Future use
  // anomaly_type?: string; // Future use
  // format?: string; // Future use, e.g., "json", "csv"
}

/**
 * Fetches data for a given geometry (polygon) using the /query/ endpoint.
 * @param selectedProduct The details of the selected product.
 * @param geom The GeoJSON Feature object containing the polygon.
 * @returns The data returned by the API.
 * @throws Will throw an error if the product_id or date is missing, or if the API request fails.
 */
export async function queryValueByGeometry(
  selectedProduct: SelectedProductParams,
  geom: ApiGeomType,
): Promise<number | Record<string, unknown> | null> {
  if (!selectedProduct.product_id) {
    console.error('Product ID is missing for queryValueByGeometry')
    throw new Error('Product ID is missing. Cannot query by geometry.')
  }
  if (!selectedProduct.date) {
    console.error('Date is missing for queryValueByGeometry')
    throw new Error('Date is missing. Cannot query by geometry.')
  }

  const payload: QueryPayload = {
    product_id: selectedProduct.product_id,
    date: selectedProduct.date.replaceAll('/', '-'), // Ensure YYYY-MM-DD format
    geom: geom,
  }

  // Handle cropmask_id: Use provided one, or default to "no-mask"
  if (selectedProduct.cropmask_id) {
    payload.cropmask_id = selectedProduct.cropmask_id
  } else {
    payload.cropmask_id = 'no-mask' // Default to "no-mask"
  }

  const URL = `/query/` // Base URL is configured in http-common.ts

  try {
    console.log('Sending payload to /query/:', JSON.stringify(payload, null, 2))
    const response = await axios.post(URL, payload, {
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    })
    console.log('Received response from /query/:', response.data)
    return response.data
  } catch (error) {
    if (isAxiosError(error)) {
      console.error(
        'Error in queryValueByGeometry:',
        error.response ? error.response.data : error.message,
      )
    } else {
      console.error(
        'An unexpected error occurred in queryValueByGeometry:',
        error,
      )
    }
    throw error // Re-throw to be handled by the calling action in the store
  }
}
