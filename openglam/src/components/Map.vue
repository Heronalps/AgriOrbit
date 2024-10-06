<script setup lang="ts">
import { ref, onMounted, watch, provide } from 'vue';
import mapboxgl from 'mapbox-gl';
import { useProductStore } from '@/stores/productStore';
import { MAP_STYLES } from '@/utils/defaultSettings';
import ControlPanel from './ControlPanel.vue';
import DeckGL from './Map/DeckGL.vue';
import Mapbox from './Map/Mapbox.vue';
import Popup from './Map/Popup.vue';
import TileLayer from './Map/TileLayer.vue';

const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const productStore = useProductStore();
const isSetLocationMode = ref(false);
const mapInstance = ref(null);
const targetMarker = ref(null);

// Provide viewState
const viewState = ref({
  latitude: 36.102376,
  longitude: -80.649277,
  zoom: 4,
  pitch: 0,
  bearing: 0,
});
provide('viewState', viewState);

function toggleSetLocationMode() {
  isSetLocationMode.value = !isSetLocationMode.value;
  console.log('Set Location Mode:', isSetLocationMode.value);
}

function handleClick(event) {
  console.log('Click detected:', event);

  const { info } = event;
  if (info && info.coordinate && Array.isArray(info.coordinate) && info.coordinate.length >= 2) {
    const [longitude, latitude] = info.coordinate;
    console.log('Valid click at:', { longitude, latitude });
    
    if (isSetLocationMode.value) {
      productStore.setTargetLocation({ longitude, latitude });
      console.log('Target location set:', { longitude, latitude });
      isSetLocationMode.value = false;
      renderTargetMarker();
    } else {
      productStore.setClickedPoint({
        value: null,
        show: true,
        longitude,
        latitude
      });
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
}

function renderTargetMarker() {
  if (mapInstance.value) {
    const targetLocation = productStore.getTargetLocation();
    if (targetLocation) {
      if (targetMarker.value) {
        targetMarker.value.setLngLat([targetLocation.longitude, targetLocation.latitude]);
      } else {
        targetMarker.value = new mapboxgl.Marker()
          .setLngLat([targetLocation.longitude, targetLocation.latitude])
          .addTo(mapInstance.value);
      }
    } else if (targetMarker.value) {
      targetMarker.value.remove();
      targetMarker.value = null;
    }
  } else {
    console.warn('Map instance not ready');
  }
}

// Watch for changes in target location and update the marker
watch(() => productStore.getTargetLocation(), (newLocation) => {
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
    <div class="absolute z-50 top-10 right-10">
      <button @click="toggleSetLocationMode" class="bg-blue-500 text-white px-4 py-2 rounded">
        {{ isSetLocationMode ? 'Cancel' : 'Set Location' }}
      </button>
    </div>
    <DeckGL @click="handleClick" class="w-full h-full">
      <Mapbox 
        :accessToken="mapboxAccessToken" 
        :mapStyle="MAP_STYLES.DARK"
        @map-loaded="onMapLoaded"
      ></Mapbox>
      <TileLayer 
        v-if="productStore.getTileLayerURL()" 
        :data="productStore.getTileLayerURL()"
        :minZoom="0"
        :maxZoom="19"
      ></TileLayer>
    </DeckGL>
    
    <ControlPanel class="absolute right-10 bottom-10"></ControlPanel>
    <Popup></Popup>
  </div>
</template>

<style scoped>
.map-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>