<script setup lang="ts">
import Map from '@/components/Map.vue'
import { useAvailableDataStore } from '@/stores/availableDataStore'
import { onMounted } from 'vue'

const availableDataStore = useAvailableDataStore()

onMounted(async () => {
  availableDataStore.loadAvailableProducts()
  // dataStore.loadAvailableAdminLayers()
  availableDataStore.loadAvailableCropmasks()
})
</script>

<template>
  <Map></Map>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
