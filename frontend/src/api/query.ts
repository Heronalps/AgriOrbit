import axios from '@/http-common'
import type { SelectedProductParams } from '@/shared'

// GeoJSON type definitions
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][] // Array of linear rings (outer ring, then inner rings)
}

export interface GeoJSONFeature<G, P = Record<string, unknown>> {
  type: 'Feature'
  geometry: G
  properties: P
}

// Specific type for the geometry payload expected by the API
export type ApiGeomType = GeoJSONFeature<GeoJSONPolygon>

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
  } catch (error: any) {
    console.error(
      'Error in queryValueByGeometry:',
      error.response ? error.response.data : error.message,
    )
    throw error // Re-throw to be handled by the calling action in the store
  }
}
