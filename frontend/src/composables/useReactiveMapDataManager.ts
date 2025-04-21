// frontend/src/composables/useReactiveMapDataManager.ts
import { watch, effectScope, onScopeDispose } from 'vue'
import { useProductStore } from '@/stores/productStore'

export function useReactiveMapDataManager() {
  const productStore = useProductStore()
  const scope = effectScope()

  scope.run(() => {
    watch(
      () => ({
        productId: productStore.selectedProduct.product_id,
        date: productStore.selectedProduct.date,
        coordinates: productStore.currentMapSelectionCoordinates,
      }),
      async (newValues, oldValues) => {
        console.log(
          '[useReactiveMapDataManager] Watcher triggered. New values:',
          JSON.parse(JSON.stringify(newValues)),
          'Old values:',
          JSON.parse(JSON.stringify(oldValues)),
        )

        const { productId, date, coordinates } = newValues

        if (productId && date && coordinates) {
          // Check if the relevant values have actually changed to avoid redundant calls
          // This is important if other parts of selectedProduct change but not id/date,
          // or if coordinates object is re-assigned with same values.
          const oldProductId = oldValues?.productId
          const oldDate = oldValues?.date
          const oldCoordinates = oldValues?.coordinates

          if (
            productId !== oldProductId ||
            date !== oldDate ||
            coordinates.longitude !== oldCoordinates?.longitude ||
            coordinates.latitude !== oldCoordinates?.latitude
          ) {
            console.log(
              '[useReactiveMapDataManager] Conditions met. Calling loadDataForClickedPointViaPolygon for pinned point:',
              JSON.parse(JSON.stringify(coordinates)),
            )
            await productStore.loadDataForClickedPointViaPolygon(
              coordinates.longitude,
              coordinates.latitude,
            )
          } else {
            console.log(
              '[useReactiveMapDataManager] Watched values changed, but key data (productId, date, coordinates) for pinned point remains the same. No API call.',
            )
          }
        } else {
          console.log(
            '[useReactiveMapDataManager] Not all conditions met for reactive data load (productId, date, or coordinates missing).',
          )
        }
      },
      { deep: true }, // Deep watch on coordinates
    )
  })

  onScopeDispose(() => {
    console.log('[useReactiveMapDataManager] Disposing scope.')
    scope.stop()
  })

  // No explicit return needed if it's just setting up watchers
  // However, you could return a status or control methods if necessary
}
