<script setup lang="ts">
import { ref, onMounted, watch, provide } from 'vue';
import mapboxgl from 'mapbox-gl';
import { useProductStore } from '@/stores/productStore';
import { useLocationStore } from '@/stores/locationStore';
import { MAP_STYLES } from '@/utils/defaultSettings';
import ControlPanel from './ControlPanel.vue';
import DeckGL from './Map/DeckGL.vue';
import MapboxView from './Map/MapboxView.vue';
import MapPopup from './Map/MapPopup.vue';
import TileLayer from './Map/TileLayer.vue';

const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const productStore = useProductStore();
const locationStore = useLocationStore();
const isSetLocationMode = ref(false);
const mapInstance = ref(null);
const targetMarker = ref(null);
const showLocationHelp = ref(false);

// Provide viewState
const viewState = ref({
  latitude: 36.102376,
  longitude: -80.649277,
  zoom: 4,
  pitch: 0,
  bearing: 0,
});
provide('viewState', viewState);

// Register event listener for location selection mode activation
onMounted(() => {
  window.addEventListener('activate-location-selection', activateLocationSelection);
});

function activateLocationSelection() {
  isSetLocationMode.value = true;
  showLocationHelp.value = true;
  setTimeout(() => {
    showLocationHelp.value = false;
  }, 5000);
  console.log('Set Location Mode Activated:', isSetLocationMode.value);
}

function handleClick(event) {
  console.log('Click detected:', event);

  const { info } = event;
  if (info && info.coordinate && Array.isArray(info.coordinate) && info.coordinate.length >= 2) {
    const [longitude, latitude] = info.coordinate;
    console.log('Valid click at:', { longitude, latitude });

    if (isSetLocationMode.value) {
      locationStore.setTargetLocation({ longitude, latitude });
      console.log('Target location set:', { longitude, latitude });
      isSetLocationMode.value = false;
      renderTargetMarker();
      
      // Emit an event that can be captured globally
      window.dispatchEvent(new CustomEvent('location-selected', { 
        detail: { longitude, latitude } 
      }));
    } else {
      productStore.clickedPoint = {
        value: null,
        x: info.x,
        y: info.y
      };
      productStore.loadValueAtPoint(longitude, latitude);
      console.log('Clicked point updated:', productStore.clickedPoint);
    }
  } else {
    console.warn("Click event does not contain valid coordinate data.");
    console.log('Info object:', info);
  }
}

function onMapLoaded(map) {
  mapInstance.value = map;
  console.log('Mapbox instance ready');
  renderTargetMarker(); // Initial render of target marker if exists

  // Ensure marker stays on top when new layers are added
  map.on('sourcedata', bringMarkerToFront);
}

function renderTargetMarker() {
  if (mapInstance.value) {
    // Access getter as a property
    const targetLocation = locationStore.targetLocation;
    if (targetLocation) {
      if (targetMarker.value) {
        targetMarker.value.setLngLat([targetLocation.longitude, targetLocation.latitude]);
      } else {
        targetMarker.value = new mapboxgl.Marker({
          anchor: 'bottom',
          color: "#FF2400", // Red color
          scale: 2 // Twice the default size
        })
          .setLngLat([targetLocation.longitude, targetLocation.latitude])
          .addTo(mapInstance.value);
      }
      bringMarkerToFront();
    } else if (targetMarker.value) {
      targetMarker.value.remove();
      targetMarker.value = null;
    }
  } else {
    console.warn('Map instance not ready');
  }
}

function bringMarkerToFront() {
  if (targetMarker.value && targetMarker.value.getElement()) {
    const markerElement = targetMarker.value.getElement();
    markerElement.style.zIndex = '1000'; // High z-index to ensure it's on top
  }
}

// Watch for changes in target location and update the marker
// Access getter as a property in the watcher source
watch(() => locationStore.targetLocation, (newLocation) => {
  console.log('Target location updated:', newLocation);
  renderTargetMarker();
}, { deep: true });
</script>

<template>
  <div class="map-container relative w-screen h-screen overflow-hidden">
    <div class="absolute z-50 top-10 left-10">
      <p class="text-3xl font-bold text-center text-white">
        AgriOrbit
      </p>
    </div>
    
    <!-- Location help overlay -->
    <div
      v-if="showLocationHelp"
      class="location-help-overlay"
    >
      <div class="location-help-content">
        <p><strong>Click on the map</strong> to set your farm location</p>
      </div>
    </div>
    
    <DeckGL
      class="w-full h-full"
      @click="handleClick"
    >
      <MapboxView
        :access-token="mapboxAccessToken"
        :map-style="MAP_STYLES.DARK"
        @map-loaded="onMapLoaded"
      />
      <TileLayer
        v-if="productStore.getTileLayerURL()"
        :data="productStore.getTileLayerURL()"
        :min-zoom="0"
        :max-zoom="19"
      />
    </DeckGL>

    <ControlPanel class="absolute right-10 bottom-10" />
    <MapPopup />
  </div>
</template>

<style>
.map-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.custom-marker {
  font-size: 24px;
  cursor: pointer;
}

/* Ensure Mapbox controls are below our marker */
.mapboxgl-control-container {
  z-index: 999 !important;
}

.location-help-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  animation: fadeInOut 5s forwards;
}

.location-help-content {
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  font-size: 18px;
  text-align: center;
  border: 1px solid #368535;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
</style>