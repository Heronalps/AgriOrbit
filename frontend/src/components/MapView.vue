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
import { usePointDataStore } from '@/stores/pointDataStore'
import { useMapViewState } from '@/composables/useMapViewState'
import { MAP_STYLES } from '@/utils/defaultSettings'
import ControlPanel from './ControlPanel.vue'
import DeckGL from './Map/DeckGL.vue'
import MapboxView from './Map/MapboxView.vue'
import TileLayer from './Map/TileLayer.vue'

/**
 * Mapbox access token retrieved from environment variables.
 * @type {string}
 */
const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

// Component Stores
const productStore = useProductStore()
const locationStore = useLocationStore()
const pointDataStore = usePointDataStore()

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
 * Use the centralized map view state composable
 * This state is shared across components (DeckGL, Mapbox, etc.)
 */
const { viewState } = useMapViewState()
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
    isSetLocationMode.value = false
    renderTargetMarker()
    window.dispatchEvent(
      new CustomEvent('location-selected', { detail: { longitude, latitude } }),
    )
  } else if (!locationStore.targetLocation) {
    // Scenario 2: Not in explicit "set location mode", AND no farm location is set yet.
    locationStore.setTargetLocation({ longitude, latitude })
    renderTargetMarker()
    window.dispatchEvent(
      new CustomEvent('location-selected', { detail: { longitude, latitude } }),
    )
  } else {
    // Scenario 3: Farm location is already set.
    pointDataStore.setCurrentMapSelectionCoordinates(longitude, latitude) // For popup
  }

  // Handle popup display and data loading for the *clicked* point (not necessarily the farm location)
  if (!productStore.isProductSelected) {
    console.warn(
      'MapView: No product selected. Skipping data load for clicked point popup.',
    )
    pointDataStore.setClickedPointCoordinates(
      info.x,
      info.y,
      longitude,
      latitude,
    )
    pointDataStore.clickedPoint.value = null
    pointDataStore.clickedPoint.show = true
    pointDataStore.clickedPoint.isLoading = false
    pointDataStore.clickedPoint.errorMessage =
      'Please select a product layer to get data for a point.'
    return
  }

  // Set screen coordinates and geo-coordinates in pointDataStore for the popup
  pointDataStore.setClickedPointCoordinates(info.x, info.y, longitude, latitude)
  // Trigger data loading for the *clicked* point for the popup
  if (
    locationStore.targetLocation?.longitude !== longitude ||
    locationStore.targetLocation?.latitude !== latitude
  ) {
    pointDataStore.loadDataForClickedPoint(longitude, latitude)
  }
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

      // Assert mapInstance.value as any to resolve complex type instantiation issues
      const currentMap = mapInstance.value as any;

      if (targetMarker.value) {
        targetMarker.value.setLngLat([
          targetLocation.longitude,
          targetLocation.latitude,
        ])
      } else {
        targetMarker.value = new mapboxgl.Marker(markerOptions)
          .setLngLat([targetLocation.longitude, targetLocation.latitude])
          .addTo(currentMap as any) // Use type assertion to any for addTo
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
    renderTargetMarker()
  },
  { deep: true },
) // Deep watch for changes within the location object

// Watch for changes in farm location, selected product, or date to query data for the farm location.
watch(
  [
    () => locationStore.targetLocation,
    () => productStore.getSelectedProduct.product_id,
    () => productStore.getSelectedProduct.date,
  ],
  (
    [farmLocation, productId, date],
    [oldFarmLocation, oldProductId, oldDate],
  ) => {
    if (farmLocation && productId && date) {
      // Check if any of the key properties have actually changed to avoid redundant queries
      const farmLocationChanged =
        JSON.stringify(farmLocation) !== JSON.stringify(oldFarmLocation)
      const productChanged = productId !== oldProductId
      const dateChanged = date !== oldDate

      if (farmLocationChanged || productChanged || dateChanged) {
        console.log(
          'Farm location, product, or date changed. Re-querying for farm location:',
          { farmLocation, productId, date },
        )
        pointDataStore.loadDataForClickedPoint(
          farmLocation.longitude,
          farmLocation.latitude,
        )
      }
    } else {
      // console.log('MapView: Not all conditions met for farm location data query (location, product, or date missing).');
    }
  },
  { deep: true, immediate: false }, // immediate: false to avoid query on initial undefined values if not desired
)

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
    <!-- Deck.gl Canvas for data layers and map interaction -->
    <DeckGL
      class="w-full h-full"
      :is-selecting-location="isSetLocationMode"
      @click="handleClick"
    >
      <!-- Mapbox Base Map -->
      <MapboxView
        :access-token="mapboxAccessToken"
        :map-style="MAP_STYLES.dark"
        @map-loaded="(map: mapboxgl.Map) => onMapLoaded(map)"
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
