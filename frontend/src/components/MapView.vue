/** * @file MapView.vue * @description This component is the main map interface,
integrating Mapbox GL for the base map * and Deck.gl for data overlays. It
handles user interactions like clicking on the map to * either set a target farm
location or to get information about a specific point on a data layer. * It also
displays a control panel and a popup for clicked point information. */
<script setup lang="ts">
import { ref, onMounted, watch, provide, onBeforeUnmount } from 'vue'
import mapboxgl from 'mapbox-gl'
import { useProductStore } from '@/stores/productStore'
import { useLocationStore } from '@/stores/locationStore'
import { MAP_STYLES } from '@/utils/defaultSettings'
import ControlPanel from './ControlPanel.vue'
import DeckGL from './Map/DeckGL.vue'
import MapboxView from './Map/MapboxView.vue'
import MapPopup from './Map/MapPopup.vue'
import TileLayer from './Map/TileLayer.vue'

/**
 * Mapbox access token retrieved from environment variables.
 * @type {string}
 */
const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

// Component Stores
const productStore = useProductStore()
const locationStore = useLocationStore()

/**
 * Indicates if the map is currently in "set location" mode.
 * @type {ref<boolean>}
 */
const isSetLocationMode = ref(false)

/**
 * Holds the Mapbox GL map instance.
 * @type {ref<mapboxgl.Map | null>}
 */
const mapInstance = ref<mapboxgl.Map | null>(null)

/**
 * Holds the Mapbox GL marker instance for the target location.
 * @type {ref<mapboxgl.Marker | null>}
 */
const targetMarker = ref<mapboxgl.Marker | null>(null)

/**
 * Controls the visibility of the help message for setting a location.
 * @type {ref<boolean>}
 */
const showLocationHelp = ref(false)

/**
 * Reactive object representing the current map view state (camera position).
 * This is provided to child components (like DeckGL) for synchronization.
 * @type {ref<object>}
 */
const viewState = ref({
  latitude: 36.102376, // Default latitude
  longitude: -80.649277, // Default longitude
  zoom: 4, // Default zoom level
  pitch: 0, // Default pitch (0 for 2D view)
  bearing: 0, // Default bearing (0 for North up)
})
provide('viewState', viewState) // Provide viewState to child components

/**
 * Lifecycle hook: Called when the component is mounted.
 * Sets up an event listener for activating location selection mode.
 */
onMounted(() => {
  window.addEventListener(
    'activate-location-selection',
    activateLocationSelection,
  )
})

/**
 * Lifecycle hook: Called before the component is unmounted.
 * Cleans up the event listener.
 */
onBeforeUnmount(() => {
  window.removeEventListener(
    'activate-location-selection',
    activateLocationSelection,
  )
  if (mapInstance.value) {
    mapInstance.value.off('sourcedata', bringMarkerToFront)
  }
})

/**
 * Activates the mode for users to select their farm location on the map.
 * Displays a temporary help message.
 */
function activateLocationSelection() {
  isSetLocationMode.value = true
  showLocationHelp.value = true
  setTimeout(() => {
    showLocationHelp.value = false
  }, 5000) // Hide help message after 5 seconds
  // console.log('Set Location Mode Activated:', isSetLocationMode.value);
}

/**
 * Handles click events on the map.
 * If in "set location" mode, it sets the target farm location.
 * Otherwise, it fetches data for the clicked point from the product store.
 * If a farm location is already set, it also updates the `currentMapSelectionCoordinates`.
 * @param {object} event - The click event object from Deck.gl, containing coordinate info.
 */
function handleClick(event: {
  info: { coordinate: [number, number]; x: number; y: number }
}) {
  const { info } = event
  if (!info || typeof info.x !== 'number' || typeof info.y !== 'number') {
    console.warn('MapView: Click event does not have valid screen coordinates.')
    return
  }

  let longitude: number, latitude: number
  if (mapInstance.value) {
    const LngLat = mapInstance.value.unproject([info.x, info.y])
    longitude = LngLat.lng
    latitude = LngLat.lat
  } else if (
    info.coordinate &&
    Array.isArray(info.coordinate) &&
    info.coordinate.length >= 2
  ) {
    console.warn(
      'MapView: mapInstance not available for unprojecting click. Falling back to Deck.gl coordinates.',
    )
    ;[longitude, latitude] = info.coordinate
  } else {
    console.warn(
      'MapView: Click event does not contain valid coordinate data for any action.',
    )
    return
  }

  // Scenario 1: Explicitly in "set location mode" (e.g., triggered from chat)
  if (isSetLocationMode.value) {
    locationStore.setTargetLocation({ longitude, latitude })
    // Also set this as the current map selection for immediate data loading if a product is selected
    productStore.setCurrentMapSelectionCoordinates(longitude, latitude)
    isSetLocationMode.value = false // Exit explicit set location mode
    renderTargetMarker()
    window.dispatchEvent(
      new CustomEvent('location-selected', { detail: { longitude, latitude } }),
    )
    // Data loading for this point will be handled by the reactive watcher for currentMapSelectionCoordinates
    // and the explicit call for the popup below.
  } else if (!locationStore.targetLocation) {
    // Scenario 2: Not in explicit "set location mode", AND no farm location is set yet.
    // This click sets the farm location AND the current map selection.
    locationStore.setTargetLocation({ longitude, latitude })
    productStore.setCurrentMapSelectionCoordinates(longitude, latitude)
    renderTargetMarker()
    window.dispatchEvent(
      new CustomEvent('location-selected', { detail: { longitude, latitude } }),
    )
    // Data loading for this point will be handled by the reactive watcher and explicit call below.
  } else {
    // Scenario 3: Farm location is already set. This click updates the current map selection for data fetching.
    productStore.setCurrentMapSelectionCoordinates(longitude, latitude)
    // Data loading for this point will be handled by the reactive watcher and explicit call below.
  }

  // Common logic for all click scenarios (after location handling):
  // Update `clickedPoint` for the popup and explicitly trigger its data load.
  // The `useReactiveMapDataManager` will handle data loading for the `currentMapSelectionCoordinates` (the "pinned" point)
  // if the product/date is also set.

  if (!productStore.isProductSelected) {
    console.warn(
      'MapView: No product selected. Skipping data load for clicked point popup.',
    )
    productStore.clickedPoint = {
      value: null,
      x: info.x,
      y: info.y,
      show: true,
      longitude,
      latitude,
      isLoading: false,
      errorMessage: 'Please select a product layer to get data for a point.',
    }
    return
  }

  // Update clickedPoint for immediate popup display. This is for the *specific* click.
  productStore.clickedPoint = {
    value: null,
    x: info.x,
    y: info.y,
    show: false, // Will be set to true by loadDataForClickedPointViaPolygon upon completion/error
    longitude,
    latitude,
    isLoading: true,
    errorMessage: null,
  }
  // Explicitly load data for the *clicked point* for the popup.
  // This ensures the popup always reflects the most recent click,
  // even if `currentMapSelectionCoordinates` (pinned point) is the same.
  productStore.loadDataForClickedPointViaPolygon(longitude, latitude)
}

/**
 * Callback function executed when the Mapbox map instance is loaded.
 * Stores the map instance and renders the target marker if a location is already set.
 * @param {mapboxgl.Map} map - The Mapbox GL map instance.
 */
function onMapLoaded(map: mapboxgl.Map) {
  mapInstance.value = map
  // console.log('Mapbox instance ready'); // Debug log
  renderTargetMarker() // Initial render of target marker if a location exists

  // Ensure marker stays on top when new layers or sources are added/changed
  map.on('sourcedata', bringMarkerToFront)
}

/**
 * Renders or updates the target location marker on the map.
 * If a target location is set in the location store, a marker is added or moved.
 * If no target location is set, any existing marker is removed.
 */
function renderTargetMarker() {
  if (mapInstance.value) {
    const targetLocation = locationStore.targetLocation // Access getter as a property
    if (targetLocation) {
      // Define marker options, including the new offset
      const markerOptions: mapboxgl.MarkerOptions = {
        anchor: 'bottom', // Anchor point of the marker
        color: '#FF2400', // Bright red color for visibility
        scale: 1.5, // Slightly larger than default for emphasis
        offset: [0, 5], // Offset in pixels: [x, y]. Positive y moves marker down.
      }

      if (targetMarker.value) {
        targetMarker.value.setLngLat([
          targetLocation.longitude,
          targetLocation.latitude,
        ])
        // For Mapbox GL JS, if you need to update options like offset on an existing marker,
        // you typically have to remove and re-add the marker, or manipulate its element directly.
        // Setting LngLat updates position, but not other visual properties post-creation directly via a method.
        // However, since our offset is static, it will be applied correctly when the marker is first created.
        // If the marker were to change its offset dynamically, a remove/re-add strategy would be needed.
      } else {
        targetMarker.value = new mapboxgl.Marker(markerOptions)
          .setLngLat([targetLocation.longitude, targetLocation.latitude])
          .addTo(mapInstance.value)
      }
      bringMarkerToFront() // Ensure marker is on top
    } else if (targetMarker.value) {
      // If no target location, remove the marker
      targetMarker.value.remove()
      targetMarker.value = null
    }
  } else {
    // This case should ideally not happen if onMapLoaded was called
    console.warn('MapView: Map instance not ready for rendering target marker.')
  }
}

/**
 * Ensures the target marker is rendered on top of other map elements.
 * This is important as new layers (like TileLayer) might be added above it.
 */
function bringMarkerToFront() {
  if (targetMarker.value && targetMarker.value.getElement()) {
    const markerElement = targetMarker.value.getElement()
    // Set a high z-index to ensure the marker is visually on top
    markerElement.style.zIndex = '1000'
  }
}

// Watch for changes in the target location from the store and re-render the marker.
watch(
  () => locationStore.targetLocation,
  () => {
    // Removed unused newLocation parameter
    renderTargetMarker()
  },
  { deep: true },
) // Deep watch for changes within the location object

// Watch for changes in the selected product's tile layer URL to potentially re-render or adjust map view.
watch(
  () => productStore.getTileLayerURL(),
  (newUrl, oldUrl) => {
    if (newUrl !== oldUrl) {
      // console.log("Tile layer URL changed:", newUrl); // Debug log
      // Potentially trigger map updates or layer refreshes if needed here
    }
  },
)
</script>

<template>
  <div class="map-container relative w-screen h-screen overflow-hidden">
    <!-- Application Title -->
    <div class="absolute z-50 top-10 left-10">
      <p
        class="text-3xl font-bold text-center text-white app-title-text-shadow"
      >
        AgriOrbit
      </p>
    </div>

    <!-- Location Selection Help Overlay -->
    <div
      v-if="showLocationHelp"
      class="location-help-overlay"
      aria-live="polite"
    >
      <div class="location-help-content">
        <p><strong>Click on the map</strong> to set your farm location.</p>
      </div>
    </div>

    <!-- Deck.gl Canvas for data layers and map interaction -->
    <DeckGL
      class="w-full h-full"
      :is-selecting-location="isSetLocationMode"
      @click="handleClick"
    >
      <!-- Mapbox Base Map -->
      <MapboxView
        :access-token="mapboxAccessToken"
        :map-style="MAP_STYLES.DARK"
        @map-loaded="(map) => onMapLoaded(map as mapboxgl.Map)"
      />
      <!-- Tile Layer for Product Data -->
      <TileLayer
        v-if="productStore.getTileLayerURL()"
        :data="productStore.getTileLayerURL()!"
        :min-zoom="0"
        :max-zoom="19"
      />
    </DeckGL>

    <!-- Control Panel Component -->
    <ControlPanel />
    <!-- Map Popup for Clicked Point Info -->
    <MapPopup />
  </div>
</template>

<style>
/* Styles for the main map container to fill the viewport */
.map-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Styling for the application title to add a subtle text shadow for better readability on map backgrounds */
.app-title-text-shadow {
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
}

/* Ensure Mapbox controls (like zoom buttons) are below our custom marker and popups */
.mapboxgl-control-container {
  z-index: 999 !important; /* Use !important cautiously, ensure it's necessary */
}

/* Styles for the location selection help message overlay */
.location-help-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001; /* Ensure it's above map but potentially below other critical UI like modals */
  animation: fadeInOut 5s forwards; /* Animation for fade in and out */
}

.location-help-content {
  background-color: rgba(0, 0, 0, 0.75); /* Semi-transparent dark background */
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  font-size: 1.1em; /* Slightly larger font size */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); /* Softer shadow */
}

/* Keyframes for the fadeInOut animation of the help message */
@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  10% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  90% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
}
</style>
