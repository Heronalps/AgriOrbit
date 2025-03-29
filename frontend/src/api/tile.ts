import BASEURL from '@/api/baseURL'
import { selectedProductType } from '@/shared'

/**
 * Computes the complete URL for a map tile based on the selected product and its parameters.
 *
 * @param {selectedProductType} selectedProduct - The currently selected product configuration,
 * including product ID, date, and other relevant parameters like cropmask_id.
 * @returns {string | null} The fully constructed tile URL, or null if essential parameters
 * (product_id or date) are missing.
 */
export function computeTileLayerURL(
  selectedProduct: selectedProductType
): string | null {
  const { product_id, date, ...otherParams } = selectedProduct

  // Create a mutable copy for paramsObject to avoid modifying the original selectedProduct spread
  const paramsObject: Record<string, unknown> = { ...otherParams }

  // Remove cropmask_id if it's explicitly set to 'no-mask' or 'null',
  // indicating no cropmask should be applied.
  if (
    paramsObject.cropmask_id === 'no-mask' ||
    paramsObject.cropmask_id === 'null'
  ) {
    delete paramsObject.cropmask_id
  }

  // Essential parameters (product_id and date) must be defined.
  if (product_id === undefined || date === undefined) {
    console.error(
      'Tile URL computation failed: Missing product_id or date.',
      { product_id, date } // Log the problematic values
    )
    return null
  }

  // Construct the base tile URL structure.
  // Dates are expected to be in a format that might contain '/', which are replaced with '-'.
  const tileURL = `${BASEURL}/tiles/${product_id}/${date.replaceAll(
    '/',
    '-'
  )}/{z}/{x}/{y}.png?`

  // Convert the remaining parameters into a query string.
  // Ensure all parameter values are strings for URLSearchParams.
  const queryParams = new URLSearchParams(
    Object.entries(paramsObject).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        // Only include defined, non-null values
        acc[key] = String(value)
      }
      return acc
    }, {} as Record<string, string>)
  ).toString()

  return tileURL + queryParams
}

/**
 * Fetches a map tile from the given URL.
 *
 * @param {string} url - The URL of the tile to fetch.
 * @returns {Promise<Response | null>} A promise that resolves to the Response object
 * if the fetch is successful and the response status is OK, otherwise resolves to null.
 */
export async function fetchTile(url: string): Promise<Response | null> {
  if (!url) {
    console.error('Tile fetch failed: URL is null or empty.')
    return null
  }
  try {
    const response = await fetch(url)
    if (!response.ok) {
      // Log more details for failed requests.
      console.error(
        `Tile request failed with status ${response.status} (${response.statusText}) for URL: ${url}`
      )
      return null
    }
    return response
  } catch (error: unknown) {
    // Catching 'any' and then checking type is a common pattern
    let errorMessage = 'An unknown error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`Tile request encountered an error: ${errorMessage}`, {
      url,
      error,
    })
    return null
  }
}
