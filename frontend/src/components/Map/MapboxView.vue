<script setup lang="ts">
import { MAPBOX_SETTINGS } from '@/utils/defaultSettings'
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

/**
 * Handles changes in the system's color scheme preference (dark/light mode).
 * Updates the map's basemap style accordingly.
 * @param event - The MediaQueryListEvent indicating the change.
 */
const handleSystemColorSchemeChange = (event: MediaQueryListEvent) => {
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
    console.error(
      "[MapboxView.vue] Map container element with ID 'map' not found in the DOM.",
    )
    return
  }

  if (!props.accessToken) {
    console.error(
      '[MapboxView.vue] Mapbox access token is required but was not provided.',
    )
    return
  }
  mapboxgl.accessToken = props.accessToken

  if (!viewState) {
    console.error(
      '[MapboxView.vue] ViewState was not injected. Map cannot be initialized without it.',
    )
    return
  }

  // Create the Mapbox map instance
  const initialMapInstance = new mapboxgl.Map({
    ...MAPBOX_SETTINGS, // Default settings
    ...attrs, // Pass down any non-prop attributes
    container: mapContainer, // Use the actual DOM element
    style: props.mapStyle, // Use provided map style; no default fallback here
    center: [viewState.longitude, viewState.latitude],
    zoom: viewState.zoom,
    pitch: viewState.pitch,
    bearing: viewState.bearing,
    interactive: false, // Set to false as Deck.gl will handle interactions
  })
  map.value = initialMapInstance

  initialMapInstance.on('load', () => {
    emit('map-loaded', initialMapInstance)

    // Synchronize the initial basemap in the store based on the map's current style
    const currentStyle = initialMapInstance.getStyle()
    const initialStyleName = currentStyle?.name // No fallback, rely on the provided style's name
    let initialBasemapId = '' // No default, will be determined from initialStyleName

    if (initialStyleName) {
      // Determine basemap ID from style name
      switch (initialStyleName.toLowerCase()) {
        case 'mapbox streets':
        case 'streets-v11':
        case 'streets-v12':
          initialBasemapId = 'streets'
          break
        case 'mapbox outdoors':
        case 'outdoors-v11':
        case 'outdoors-v12':
          initialBasemapId = 'outdoors'
          break
        case 'mapbox light':
        case 'light-v10':
        case 'light-v11':
          initialBasemapId = 'light'
          break
        case 'mapbox dark':
        case 'dark-v10':
        case 'dark-v11':
          initialBasemapId = 'dark'
          break
        case 'mapbox satellite':
        case 'satellite-v9':
          initialBasemapId = 'satellite'
          break
        case 'mapbox satellite streets':
        case 'satellite-streets-v11':
        case 'satellite-streets-v12':
          initialBasemapId = 'satellite-streets'
          break
        case 'mapbox navigation day':
        case 'navigation-day-v1':
          initialBasemapId = 'navigation-day'
          break
        case 'mapbox navigation night':
        case 'navigation-night-v1':
          initialBasemapId = 'navigation-night'
          break
        default:
          console.warn(
            `[MapboxView.vue] Unrecognized initial map style name: '${initialStyleName}'. Could not map to a known basemapId. Style URL: ${
              currentStyle?.url || 'N/A'
            }`,
          )
      }
      if (initialBasemapId) {
        mapStore.selectedBasemap = initialBasemapId
      } else {
        console.warn(
          `[MapboxView.vue] Could not determine a basemapId for style name: '${initialStyleName}'. Check style name to basemapId mappings.`,
        )
      }
    } else {
      console.warn(
        '[MapboxView.vue] Initial map style name is undefined (props.mapStyle might be missing or style has no name). Basemap synchronization might be affected.',
      )
    }

    // Listen for system color scheme changes
    darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeMediaQuery.addEventListener('change', handleSystemColorSchemeChange)
    // Set initial basemap based on current system preference
    handleSystemColorSchemeChange(darkModeMediaQuery)
  })

  initialMapInstance.on('error', (errorEvent) => {
    console.error(
      '[MapboxView.vue] A Mapbox GL error occurred:',
      errorEvent?.error,
    )
  })
})

/**
 * Lifecycle hook called before the component is unmounted.
 * Cleans up resources, such as the Mapbox map instance and event listeners.
 */
onBeforeUnmount(() => {
  if (darkModeMediaQuery) {
    darkModeMediaQuery.removeEventListener(
      'change',
      handleSystemColorSchemeChange,
    )
    darkModeMediaQuery = null
  }
  if (map.value) {
    map.value.remove() // Properly dispose of the Mapbox instance
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
    if (map.value && newBasemapId) {
      let styleUrl: string | undefined // Initialize as undefined
      switch (newBasemapId) {
        case 'streets':
          styleUrl = 'mapbox://styles/mapbox/streets-v12'
          break
        case 'outdoors':
          styleUrl = 'mapbox://styles/mapbox/outdoors-v12'
          break
        case 'light':
          styleUrl = 'mapbox://styles/mapbox/light-v11'
          break
        case 'dark':
          styleUrl = 'mapbox://styles/mapbox/dark-v11'
          break
        case 'satellite':
          styleUrl = 'mapbox://styles/mapbox/satellite-v9'
          break
        case 'satellite-streets':
          styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12'
          break
        case 'navigation-day':
          styleUrl = 'mapbox://styles/mapbox/navigation-day-v1'
          break
        case 'navigation-night':
          styleUrl = 'mapbox://styles/mapbox/navigation-night-v1'
          break
        default:
          // Do not set a default styleUrl; let the map retain its current style.
          console.warn(
            `[MapboxView.vue] Unknown basemap ID: '${newBasemapId}'. Cannot set style. Ensure ControlPanel provides valid IDs.`,
          )
        // styleUrl remains undefined
      }

      if (styleUrl) {
        // Only attempt to set style if a valid URL was determined
        map.value.setStyle(styleUrl)

        // After style change, ensure projection remains Mercator if needed.
        // This is important if some styles might default to Globe projection.
        map.value.once('styledata', () => {
          if (map.value && map.value.getProjection().name !== 'mercator') {
            map.value.setProjection({ name: 'mercator' })
          }
        })
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
