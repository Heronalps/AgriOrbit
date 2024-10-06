<script setup lang="ts">
import { useProductStore } from '@/stores/productStore';
import { MAP_STYLES } from '@/utils/defaultSettings';
import ControlPanel from './ControlPanel.vue';
import DeckGL from './Map/DeckGL.vue';
import Mapbox from './Map/Mapbox.vue';
import Popup from './Map/Popup.vue';
import TileLayer from './Map/TileLayer.vue';
import ChatWidget from './Chat/ChatWidget.vue'; // Import the ChatWidget

const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
// console.log("mapbox token", mapboxAccessToken);

const productStore = useProductStore();

function handleClick(info, event) {
  productStore.clickedPoint.value = null;
  productStore.clickedPoint.show = true;
  const { object, x, y, coordinate } = info.info;
  productStore.loadValueAtPoint(coordinate[0], coordinate[1]);
  productStore.clickedPoint.x = x;
  productStore.clickedPoint.y = y;
}
</script>

<template>
  <div class="map-container relative w-screen h-screen overflow-hidden">
    <div class="absolute z-50 top-10 left-10">
      <p class="text-3xl font-bold text-center text-white">
        AgriOrbit
      </p>
    </div>
    <DeckGL @click="handleClick" class="w-full h-full">
      <Mapbox :accessToken="mapboxAccessToken" :mapStyle="MAP_STYLES.DARK"></Mapbox>
      <TileLayer :data="productStore.getTileLayerURL()"></TileLayer>
    </DeckGL>
    <ControlPanel class="absolute right-10 bottom-10"></ControlPanel>
    <Popup></Popup>
    <!-- <ChatWidget class="absolute z-60 bottom-10 right-10" /> -->
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
