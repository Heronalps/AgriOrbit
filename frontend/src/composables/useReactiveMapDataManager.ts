// frontend/src/composables/useReactiveMapDataManager.ts
import { watch, effectScope, onScopeDispose } from 'vue'
import { useProductStore } from '@/stores/productStore'

export function useReactiveMapDataManager() {
  const productStore = useProductStore()
  const scope = effectScope()

  // Define an interface for the structure of our watched values
  interface WatchedProductState {
    productId: string
    date: string
    coordinates: {
      longitude: number
      latitude: number
    }
  }

  scope.run(() => {
    watch(
      () => {
        const pid = productStore.selectedProduct.product_id
        const pdate = productStore.selectedProduct.date
        const pcoords = productStore.currentMapSelectionCoordinates

        // Only return a "complete" object if all parts are defined and valid.
        // A valid pcoords object must have longitude and latitude.
        if (
          pid &&
          pdate &&
          pcoords &&
          typeof pcoords.longitude === 'number' &&
          typeof pcoords.latitude === 'number'
        ) {
          return {
            productId: pid,
            date: pdate,
            coordinates: pcoords, // Return the actual reactive coordinates object
          } as WatchedProductState // Explicitly cast to our defined type
        }
        // Otherwise, return null to signify an incomplete or invalid state.
        // This prevents the watcher callback from processing partial or invalid data.
        return null
      },
      async (
        newValues: WatchedProductState | null,
        oldValues: WatchedProductState | null,
      ) => {
        const newIsComplete = newValues !== null
        const oldIsComplete = oldValues !== null

        // Log the basic transition, indicating whether the current state is considered complete and valid.
        console.log(
          '[useReactiveMapDataManager] Watcher callback invoked. New state:',
          newIsComplete
            ? JSON.parse(JSON.stringify(newValues))
            : 'incomplete/invalid',
          'Old state:',
          oldIsComplete
            ? JSON.parse(JSON.stringify(oldValues))
            : 'incomplete/invalid',
        )

        // Proceed only if newValues is not null (i.e., all required data is present and valid).
        if (newIsComplete) {
          const { productId, date, coordinates } = newValues! // newValues is not null here

          let hasMeaningfulChange = false
          if (!oldIsComplete) {
            // If there were no old complete values (state was previously incomplete/invalid),
            // and now we have complete newValues, it's a meaningful change.
            hasMeaningfulChange = true
          } else {
            // oldValues exist and were complete, compare with newValues.
            // newValues and oldValues structure is guaranteed here by the source function.
            // oldValues is also not null here.
            if (
              productId !== oldValues!.productId ||
              date !== oldValues!.date ||
              coordinates.longitude !== oldValues!.coordinates.longitude ||
              coordinates.latitude !== oldValues!.coordinates.latitude
            ) {
              hasMeaningfulChange = true
            }
          }

          if (hasMeaningfulChange) {
            console.log(
              '[useReactiveMapDataManager] Conditions met for data load. ProductId:',
              productId,
              'Date:',
              date,
              'Coords:',
              JSON.parse(JSON.stringify(coordinates)),
            )
            await productStore.loadDataForClickedPointViaPolygon(
              coordinates.longitude,
              coordinates.latitude,
            )
          } else {
            console.log(
              '[useReactiveMapDataManager] State is complete, but key data (productId, date, coordinates) remains effectively unchanged. No API call.',
            )
          }
        } else {
          // newValues is null (current state is incomplete)
          if (oldIsComplete) {
            // Transitioned from a complete state to an incomplete state
            console.log(
              '[useReactiveMapDataManager] Reactive data prerequisites became unmet. Waiting for complete data.',
            )
          } else {
            // Was already incomplete (oldValues was null), and remains incomplete (newValues is null).
            // This addresses the scenario of repeated "incomplete/invalid" logs.
            console.log(
              '[useReactiveMapDataManager] State remains incomplete. Waiting for all data prerequisites.',
            )
          }
        }
      },
      { deep: true }, // deep: true is important for changes within the coordinates object if it's mutated.
    )
  })

  onScopeDispose(() => {
    console.log('[useReactiveMapDataManager] Disposing scope.')
    scope.stop()
  })
}
