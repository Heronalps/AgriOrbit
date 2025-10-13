import { watch, onScopeDispose, effectScope } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { usePointDataStore } from '@/stores/pointDataStore'
import { useLocationStore } from '@/stores/locationStore'

export function useReactiveMapDataManager() {
  const productStore = useProductStore()
  const pointDataStore = usePointDataStore()
  const locationStore = useLocationStore()
  const scope = effectScope()

  scope.run(() => {
    watch(
      // Watch for changes in the core dependencies
      [
        () => locationStore.targetLocation,
        () => productStore.selectedProduct?.product_id,
        () => productStore.selectedProduct?.date,
      ],
      (
        [newLocation, newProductId, newDate],
        [oldLocation, oldProductId, oldDate],
      ) => {
        // 1. Guard: Ensure all necessary data is present before proceeding.
        if (!newLocation || !newProductId || !newDate) {
          console.log(
            '[useReactiveMapDataManager] Watcher: Not all dependencies are ready. Skipping.',
          )
          return
        }

        // 2. Check for meaningful changes to prevent loops.
        const locationChanged =
          JSON.stringify(newLocation) !== JSON.stringify(oldLocation)
        const productChanged = newProductId !== oldProductId
        const dateChanged = newDate !== oldDate

        if (locationChanged || productChanged || dateChanged) {
          console.log(
            '[useReactiveMapDataManager] Meaningful change detected. Loading data for farm location:',
            {
              productId: newProductId,
              date: newDate,
              coords: { lon: newLocation.longitude, lat: newLocation.latitude },
            },
          )
          // 3. Load data only if there's a real change.
          pointDataStore.loadDataForClickedPoint(
            newLocation.longitude,
            newLocation.latitude,
          )
        } else {
          console.log(
            '[useReactiveMapDataManager] Watcher triggered, but no meaningful change in dependencies. Skipping query.',
          )
        }
      },
      { deep: true }, // Use deep watch for the location object
    )
  })

  onScopeDispose(() => {
    console.log('[useReactiveMapDataManager] Disposing scope.')
    scope.stop()
  })
}
