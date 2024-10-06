<script setup lang="ts">
import Map from '@/components/Map.vue'
import ChatWidget from '@/components/Chat/ChatWidget.vue'
import { useAvailableDataStore } from '@/stores/availableDataStore'
import { onMounted } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css';

const availableDataStore = useAvailableDataStore()

onMounted(async () => {
  availableDataStore.loadAvailableProducts()
  availableDataStore.loadAvailableCropmasks()
})
</script>

<template>
  <div class="app-container">
    <Map></Map>
    <ChatWidget></ChatWidget>
  </div>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>