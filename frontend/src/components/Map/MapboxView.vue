<script setup lang="ts">
import { MAPBOX_SETTINGS, MAP_STYLES } from '@/utils/defaultSettings'
import mapboxgl, { Map } from 'mapbox-gl'
import {
  inject,
  onMounted,
  onBeforeUnmount,
  useAttrs,
  watch,
  shallowRef,
} from 'vue'
import { useMapStore } from '@/stores/mapStore'

/**
 * Defines the structure for the view state object.
 * This should ideally be imported from a shared types definition file.
 */
interface ViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
  // Add other properties if they exist in the actual ViewState object
}

/**
 * Props for the MapboxView component.
 */
const props = defineProps<{
  /**
   * Mapbox access token. This is required to use Mapbox services.
   */
  accessToken: string
  /**
   * Optional Mapbox style URL.
   * e.g., 'mapbox://styles/mapbox/streets-v12'
   */
  mapStyle?: string
}>()

/**
 * Emits for the MapboxView component.
 */
const emit = defineEmits<{
  /**
   * Emitted when the map instance has successfully loaded and is ready.
   * @param map - The Mapbox GL JS map instance.
   */
  (e: 'map-loaded', map: Map): void
}>()

/**
 * Shallow reference to the Mapbox GL JS map instance.
 * `shallowRef` is used because the Mapbox map object is mutable and complex,
 * and deep reactivity is not needed for the instance itself.
 */
const map = shallowRef<Map | null>(null)

const attrs = useAttrs()

/**
 * Injected reactive view state from a parent component (likely DeckGL.vue).
 * This state typically includes longitude, latitude, zoom, pitch, and bearing.
 */
const viewState = inject<ViewState>('viewState')

const mapStore = useMapStore()

/**
 * Reference to the MediaQueryList object for detecting dark mode preferences.
 */
let darkModeMediaQuery: MediaQueryList | null = null

// Renamed and adjusted to be the direct event listener
const systemThemeListener = (event: MediaQueryListEvent | MediaQueryList) => {
  const newBasemapId = event.matches ? 'dark' : 'light'
  // Check if the current basemap is already the one preferred by system, to avoid unnecessary setBasemap calls
  if (mapStore.selectedBasemap !== newBasemapId) {
    mapStore.setBasemap(newBasemapId)
  }
}

/**
 * Lifecycle hook called when the component is mounted.
 * Initializes the Mapbox map, sets up event listeners,
 * synchronizes the initial basemap, and configures system color scheme listeners.
 */
onMounted(() => {
  const mapContainer = document.getElementById('map')
  if (!mapContainer) {
    console.error('MapboxView: Map container element not found.')
    return
  }

  if (!props.accessToken) {
    console.error('MapboxView: Mapbox access token is not provided.')
    return
  }
  mapboxgl.accessToken = props.accessToken

  if (!viewState) {
    console.error('MapboxView: ViewState is not injected.')
    return
  }

  let initialStyleUrl: string | mapboxgl.Style | undefined

  if (props.mapStyle) {
    initialStyleUrl = props.mapStyle
    // If props.mapStyle is provided, mapStore.selectedBasemap might be initially out of sync.
    // The systemThemeListener called on 'load' will align it.
  } else {
    // No props.mapStyle: Determine style from system theme and update store *before* map creation.
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    const systemThemeBasemapId = prefersDark ? 'dark' : 'light'

    if (mapStore.selectedBasemap !== systemThemeBasemapId) {
      mapStore.setBasemap(systemThemeBasemapId)
    }
    // Now mapStore.selectedBasemap reflects the system theme.
    initialStyleUrl =
      MAP_STYLES?.[mapStore.selectedBasemap as keyof typeof MAP_STYLES]

    if (!initialStyleUrl) {
      console.warn(
        `MapboxView: No MAP_STYLE found for basemap ID '${mapStore.selectedBasemap}'. Ensure MAP_STYLES is correctly defined in defaultSettings.ts. Falling back to Mapbox Streets.`,
      )
      initialStyleUrl = 'mapbox://styles/mapbox/streets-v12' // Default fallback
    }
  }

  // Create the Mapbox map instance
  const initialMapInstance = new mapboxgl.Map({
    ...MAPBOX_SETTINGS, // IMPORTANT: Ensure MAPBOX_SETTINGS in defaultSettings.ts promotes 2D (e.g., projection: {name: 'mercator'}, terrain: null)
    ...attrs,
    container: mapContainer,
    style: initialStyleUrl, // Use the determined initial style
    center: [viewState.longitude, viewState.latitude],
    zoom: viewState.zoom,
    pitch: viewState.pitch, // For a true 2D top-down view, these should be 0
    bearing: viewState.bearing, // For a true 2D top-down view, these should be 0
    interactive: false,
  })
  map.value = initialMapInstance

  initialMapInstance.on('load', () => {
    emit('map-loaded', initialMapInstance)

    // Listen for system color scheme changes
    darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeMediaQuery.addEventListener('change', systemThemeListener)
    // Call listener once to ensure mapStore.selectedBasemap is aligned with the current system theme,
    // especially if props.mapStyle was used initially and might differ from the system theme.
    systemThemeListener(darkModeMediaQuery) // Pass the MediaQueryList to align with its current state
  })

  initialMapInstance.on('error', (errorEvent) => {
    console.error('Mapbox GL error:', errorEvent.error)
  })
})

/**
 * Lifecycle hook called before the component is unmounted.
 * Cleans up resources, such as the Mapbox map instance and event listeners.
 */
onBeforeUnmount(() => {
  if (darkModeMediaQuery) {
    darkModeMediaQuery.removeEventListener('change', systemThemeListener)
  }
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})

/**
 * Watcher for changes in the injected `viewState`.
 * When `viewState` changes (e.g., due to DeckGL interaction), update the Mapbox map's camera.
 */
watch(
  () => viewState, // Watch the injected state directly
  (currentViewState) => {
    // Check if both the map instance and the current view state are available
    if (map.value && currentViewState) {
      map.value.jumpTo({
        center: [currentViewState.longitude, currentViewState.latitude],
        zoom: currentViewState.zoom,
        pitch: currentViewState.pitch,
        bearing: currentViewState.bearing,
      })
    }
  },
  { deep: true }, // Deep watch is necessary for objects like viewState
)

/**
 * Watcher for changes in the `selectedBasemap` from the `mapStore`.
 * Updates the Mapbox map's style when the basemap selection changes.
 */
watch(
  () => mapStore.selectedBasemap,
  (newBasemapId) => {
    if (map.value && newBasemapId && MAP_STYLES) {
      const styleUrl = MAP_STYLES[newBasemapId as keyof typeof MAP_STYLES]
      if (styleUrl) {
        map.value.setStyle(styleUrl)
      } else {
        console.warn(
          `MapboxView: No style URL found in MAP_STYLES for basemap ID '${newBasemapId}'`,
        )
      }
    }
  },
)
</script>

<template>
  <div id="map" class="w-full h-full absolute top-0 left-0" />
  <!-- The ref="map" on the div is not necessary when using getElementById for map container -->
</template>

<style scoped>
/* Ensure Mapbox GL CSS is imported globally in your main.ts or App.vue */
/* @import 'mapbox-gl/dist/mapbox-gl.css'; */

/* Scoped styles for MapboxView if any specific overrides are needed */
#map {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
