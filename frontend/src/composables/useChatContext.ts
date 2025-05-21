import { useLocationStore } from '@/stores/locationStore'
import { useProductStore } from '@/stores/productStore'
import { usePointDataStore } from '@/stores/pointDataStore'

export function useChatContext() {
  const locationStore = useLocationStore()
  const productStore = useProductStore()
  const pointDataStore = usePointDataStore()

  function generateChatContext(): string {
    let context = ''
    const { selectedProduct } = productStore
    const { clickedPoint } = pointDataStore

    if (selectedProduct && selectedProduct.product_id) {
      const productName =
        selectedProduct.display_name ||
        selectedProduct.product_id ||
        'selected data layer'
      context += `(Dataset: ${productName}`
      if (selectedProduct.date) {
        context += `, Date: ${selectedProduct.date}`
      }
      if (selectedProduct.meta) {
        const metaParts: string[] = []
        if (selectedProduct.meta.type)
          metaParts.push(`Type: ${selectedProduct.meta.type}`)
        if (selectedProduct.meta.source)
          metaParts.push(`Source: ${selectedProduct.meta.source}`)
        if (metaParts.length > 0) {
          context += `, Meta: { ${metaParts.join(', ')} }`
        }
      }
      context += ') '
    }

    if (clickedPoint && clickedPoint.show) {
      if (
        typeof clickedPoint.value === 'number' &&
        !isNaN(clickedPoint.value)
      ) {
        const productNameForPoint =
          selectedProduct?.display_name ||
          selectedProduct?.product_id ||
          'the current data layer'
        let pointContext = `(Selected map data: Value ${clickedPoint.value.toFixed(
          2,
        )} for ${productNameForPoint}`
        if (selectedProduct?.date) {
          pointContext += ` on ${selectedProduct.date}`
        }
        if (
          clickedPoint.longitude !== undefined &&
          clickedPoint.latitude !== undefined
        ) {
          pointContext += ` at Lon: ${clickedPoint.longitude.toFixed(
            4,
          )}, Lat: ${clickedPoint.latitude.toFixed(4)}`
        }
        pointContext += '.) '
        context += pointContext
      } else if (clickedPoint.errorMessage) {
        context += `(Note: Issue fetching data for clicked point: ${clickedPoint.errorMessage}) `
      }
    }

    if (locationStore.targetLocation) {
      const { latitude, longitude } = locationStore.targetLocation
      context += `(Farm location: Lat ${latitude.toFixed(
        4,
      )}, Lon ${longitude.toFixed(4)}. `
      const currentDate = new Date()
      const month = currentDate.getMonth()
      const hemisphere = latitude > 0 ? 'Northern' : 'Southern'
      let season = ''
      if (hemisphere === 'Northern') {
        if (month >= 2 && month <= 4) season = 'Spring'
        else if (month >= 5 && month <= 7) season = 'Summer'
        else if (month >= 8 && month <= 10) season = 'Autumn'
        else season = 'Winter'
      } else {
        if (month >= 2 && month <= 4) season = 'Autumn'
        else if (month >= 5 && month <= 7) season = 'Winter'
        else if (month >= 8 && month <= 10) season = 'Spring'
        else season = 'Summer'
      }
      context += `Current season: ${season}. Current Date: ${
        currentDate.toISOString().split('T')[0]
      }.`
      context += ')'
    }
    return context.trim()
  }

  return {
    generateChatContext,
  }
}
