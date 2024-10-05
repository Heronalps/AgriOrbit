<script setup lang="ts">
import { MAPBOX_SETTINGS } from '@/utils/defaultSettings'
import mapboxgl from 'mapbox-gl'
import { inject, onMounted, useAttrs, watch } from 'vue'

const props = defineProps<{
  accessToken: string
  mapStyle?: string
}>()

let map: any = null
const attrs = useAttrs()
const viewState = inject('viewState')
onMounted(() => {
  mapboxgl.accessToken = props.accessToken
  map = new mapboxgl.Map({
    ...MAPBOX_SETTINGS,
    ...attrs,
    style: props.mapStyle,
  })
})

watch(
  () => viewState,
  (state, prevState) => {
    handleMapChange(state)
  },
  { deep: true }
)

function handleMapChange(viewState) {
  map.jumpTo({
    center: [viewState.longitude, viewState.latitude],
    zoom: viewState.zoom,
    bearing: viewState.bearing,
    pitch: viewState.pitch,
  })
}
</script>

<template>
  <div id="map" ref="map" class="w-full h-full absolute top-0 left-0"></div>
</template>
