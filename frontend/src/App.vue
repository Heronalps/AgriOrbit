<!--
  Root component for the application.
  Sets up the main layout with MapView and ChatWidget.
  Handles initial fetching of available products and cropmasks.
-->
<script setup lang="ts">
import MapView from '@/components/MapView.vue'
import ChatWidget from '@/components/Chat/ChatWidget.vue'
import { useAvailableDataStore } from '@/stores/availableDataStore'
import { onMounted } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css';

const availableDataStore = useAvailableDataStore()

// Fetches initial application data when the component is mounted.
onMounted(async () => {
  // Sets the document title.
  document.title = 'AgriOrbit'
  // Loads the list of available map products.
  availableDataStore.loadAvailableProducts()
  // Loads the list of available cropmasks.
  availableDataStore.loadAvailableCropmasks()
})
</script>

<template>
  <!-- Main application container -->
  <div class="app-container">
    <MapView />
    <ChatWidget />
  </div>
</template>

<style>
/* Styles for the root application element */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* Standard text color */
  color: #2c3e50;
}

/* Styles for the main application container */
.app-container {
  position: relative;
  width: 100vw; /* Full viewport width */
  height: 100vh; /* Full viewport height */
  overflow: hidden; /* Prevents scrollbars on the main container */
}
</style>