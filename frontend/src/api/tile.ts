import BASEURL from '@/api/baseURL'
import { selectedProductType } from '@/shared'

export function computeTileLayerURL(selectedProduct: selectedProductType) {
  const { product_id, date, ...paramsObject } = selectedProduct

  // Remove cropmask_id if it is 'no-mask' or 'null'
  if (
    paramsObject.cropmask_id === 'no-mask' ||
    paramsObject.cropmask_id === 'null'
  ) {
    delete paramsObject.cropmask_id
  }

  if (product_id === undefined || date === undefined) {
    console.error('Tile request failed: Missing product_id or date.')
    return null
  }

  const URL =
    BASEURL +
    `/tiles/${product_id}/${date.replaceAll('/', '-')}/{z}/{x}/{y}.png?`

  const params = new URLSearchParams(paramsObject)

  return URL + params
}

export async function fetchTile(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(
        `Tile request failed with status ${response.status}: ${url}`
      )
      return null
    }
    return response
  } catch (error) {
    console.error(`Tile request encountered an error: ${error.message}`, url)
    return null
  }
}
