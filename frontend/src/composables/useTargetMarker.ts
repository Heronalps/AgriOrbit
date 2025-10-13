import { ref, watch, toRaw } from 'vue'
import type { Ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import { useLocationStore } from '@/stores/locationStore'
import type { Map } from 'mapbox-gl'

export function useTargetMarker(mapInstance: Ref<Map | null>) {
  const locationStore = useLocationStore()
  const targetMarker = ref<mapboxgl.Marker | null>(null)

  function bringMarkerToFront() {
    if (targetMarker.value && targetMarker.value.getElement()) {
      const markerElement = targetMarker.value.getElement()
      markerElement.style.zIndex = '1000'
    }
  }

  function renderTargetMarker() {
    if (mapInstance.value) {
      const targetLocation = locationStore.targetLocation
      if (targetLocation) {
        const markerOptions: mapboxgl.MarkerOptions = {
          anchor: 'bottom',
          color: '#FF2400',
          scale: 1.5,
          offset: [0, 5],
        }

        const currentMap = toRaw(mapInstance.value)

        if (targetMarker.value) {
          targetMarker.value.setLngLat([
            targetLocation.longitude,
            targetLocation.latitude,
          ])
        } else {
          targetMarker.value = new mapboxgl.Marker(markerOptions)
            .setLngLat([targetLocation.longitude, targetLocation.latitude])
            .addTo(currentMap)
        }
        bringMarkerToFront()
      } else if (targetMarker.value) {
        targetMarker.value.remove()
        targetMarker.value = null
      }
    }
  }

  watch(
    () => locationStore.targetLocation,
    () => {
      renderTargetMarker()
    },
    { deep: true },
  )

  watch(mapInstance, (newMap) => {
    if (newMap) {
      renderTargetMarker()
      newMap.on('sourcedata', bringMarkerToFront)
    }
  })

  return {
    targetMarker,
    renderTargetMarker,
    bringMarkerToFront,
  }
}
