import type { PickingInfo } from '@deck.gl/core'
import type { MjolnirGestureEvent } from 'mjolnir.js'
import { useLocationStore } from '@/stores/locationStore'
import type { Map } from 'mapbox-gl'
import type { Ref } from 'vue'

export function useMapClickHandler(
  mapInstance: Ref<Map | null>,
  isSelectingLocation: Ref<boolean>,
) {
  const locationStore = useLocationStore()

  function handleClick(event: {
    info: PickingInfo
    event: MjolnirGestureEvent
  }) {
    // Only proceed if the application is in location selection mode.
    if (!isSelectingLocation.value) {
      return // Do nothing if not in selection mode.
    }

    console.log('[useMapClickHandler] Click detected while in selection mode.')

    const { info } = event
    if (!info || typeof info.x !== 'number' || typeof info.y !== 'number') {
      console.warn(
        '[useMapClickHandler] Click event lacks valid screen coordinates.',
      )
      return
    }

    let longitude: number, latitude: number
    if (mapInstance.value && info.coordinate) {
      const LngLat = mapInstance.value.unproject([info.x, info.y])
      longitude = LngLat.lng
      latitude = LngLat.lat
    } else if (info.coordinate && info.coordinate.length >= 2) {
      console.warn(
        '[useMapClickHandler] mapInstance not available. Falling back to Deck.gl coordinates.',
      )
      ;[longitude, latitude] = info.coordinate
    } else {
      console.warn(
        '[useMapClickHandler] Click event lacks valid coordinate data.',
      )
      return
    }

    console.log(`[useMapClickHandler] Setting target location to:`, {
      longitude,
      latitude,
    })
    locationStore.setTargetLocation({ longitude, latitude })
    // The locationStore action will automatically set isSelectingLocation to false.
  }

  return {
    handleClick,
  }
}
