import { ref, provide, markRaw, shallowRef } from 'vue'
import type { Map } from 'mapbox-gl'
import { useMapViewState } from '@/composables/useMapViewState'

export function useMapbox() {
  const mapInstance = shallowRef<Map | null>(null)
  const isMapLoaded = ref(false)

  const { viewState } = useMapViewState()
  provide('viewState', viewState)

  function onMapLoaded(map: Map) {
    mapInstance.value = markRaw(map)
    isMapLoaded.value = true
  }

  return {
    mapInstance,
    isMapLoaded,
    onMapLoaded,
    viewState,
  }
}
