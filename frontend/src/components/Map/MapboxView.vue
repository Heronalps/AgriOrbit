<script setup lang="ts">
import { MAPBOX_SETTINGS } from '@/utils/defaultSettings'
import mapboxgl from 'mapbox-gl'
import { inject, onMounted, useAttrs, watch, ref } from 'vue'

const props = defineProps<{
  accessToken: string
  mapStyle?: string
}>()

const emit = defineEmits(['map-loaded'])

const map = ref(null)
const attrs = useAttrs()
const viewState = inject('viewState')

onMounted(() => {
  mapboxgl.accessToken = props.accessToken
  map.value = new mapboxgl.Map({
    ...MAPBOX_SETTINGS,
    ...attrs,
    style: props.mapStyle,
  })

  map.value.on('load', () => {
    emit('map-loaded', map.value)
  })
})

watch(
  () => viewState,
  (state) => {
    handleMapChange(state)
  },
  { deep: true }
)

function handleMapChange(viewState) {
  if (map.value) {
    map.value.jumpTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      bearing: viewState.bearing,
      pitch: viewState.pitch,
    })
  }
}
</script>

<template>
  <div
    id="map"
    ref="map"
    class="w-full h-full absolute top-0 left-0"
  />
</template>