/** * @file MapView.vue * @description This component is the main map interface,
integrating Mapbox GL for the base map * and Deck.gl for data overlays. It
handles user interactions like clicking on the map to * either set a target farm
location or to get information about a specific point on a data layer. * It also
displays a control panel and a popup for clicked point information. */
<script setup lang="ts">
import { watch, toRef } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useLocationStore } from '@/stores/locationStore'
import { MAP_STYLES } from '@/utils/defaultSettings'
import ControlPanel from './ControlPanel.vue'
import DeckGL from './Map/DeckGL.vue'
import MapboxView from './Map/MapboxView.vue'
import TileLayer from './Map/TileLayer.vue'
import { useMapbox } from '@/composables/useMapbox'
import { useTargetMarker } from '@/composables/useTargetMarker'
import { useMapClickHandler } from '@/composables/useMapClickHandler'

/**
 * Mapbox access token retrieved from environment variables.
 * @type {string}
 */
const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

// Component Stores
const productStore = useProductStore()
const locationStore = useLocationStore()

// Set up map and related functionalities using composables
const { mapInstance, onMapLoaded } = useMapbox()
useTargetMarker(mapInstance)
const { handleClick } = useMapClickHandler(
  mapInstance,
  toRef(locationStore, 'isSelectingLocation'),
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
  <div
    class="map-container relative w-screen h-screen overflow-hidden"
    :class="{ 'selection-cursor': locationStore.isSelectingLocation }"
  >
    <!-- Deck.gl Canvas for data layers and map interaction -->
    <DeckGL
      class="w-full h-full"
      :is-selecting-location="locationStore.isSelectingLocation"
      @click="handleClick"
    >
      <!-- Mapbox Base Map -->
      <MapboxView
        :access-token="mapboxAccessToken"
        :map-style="MAP_STYLES.dark"
        @map-loaded="onMapLoaded"
      />
      <!-- Tile Layer for Product Data -->
      <TileLayer
        vif="productStore.getTileLayerURL()"
        :data="productStore.getTileLayerURL()!"
        :min-zoom="0"
        :max-zoom="19"
      />
    </DeckGL>

    <!-- Control Panel Component -->
    <ControlPanel />
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
