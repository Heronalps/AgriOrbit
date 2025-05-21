<!--
  Root component for the application.
  Sets up the main layout with MapView and ChatWidget.
  Handles initial fetching of available products and cropmasks.
-->
<script setup lang="ts">
import MapView from '@/components/MapView.vue'
import ChatWidget from '@/components/Chat/ChatWidget.vue'
import ActionToolbar from '@/components/ActionToolbar.vue'
import { useAvailableDataStore } from '@/stores/availableDataStore'
import { onMounted } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useReactiveMapDataManager } from './composables/useReactiveMapDataManager' // Relative path

const availableDataStore = useAvailableDataStore()

// Initialize the reactive map data manager
useReactiveMapDataManager()

/**
 * Fetches initial application data when the component is mounted.
 * This includes setting the document title and loading available map products and cropmasks.
 */
onMounted(async () => {
  try {
    await Promise.all([
      availableDataStore.loadAvailableProducts(),
      availableDataStore.loadAvailableCropmasks(),
    ])
  } catch (error) {
    console.error('Failed to load initial data:', error)
    // Optionally, display a user-friendly error message in the UI
  }
})
</script>

<template>
  <!-- Main application container -->
  <div id="app-container">
    <MapView />
    <ChatWidget />
    <ActionToolbar />
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
