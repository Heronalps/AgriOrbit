<script setup lang="ts">
import { TileLayer } from '@deck.gl/geo-layers'
import { BitmapLayer } from '@deck.gl/layers'
import { inject, useAttrs, watch, onMounted } from 'vue'

const attrs = useAttrs()
const updateLayer = inject('updateLayer')

if (!updateLayer) {
  console.error('updateLayer function not provided')
}

function createLayer(): any {
  if (!updateLayer) return null

  return new TileLayer({
    renderSubLayers: (props) => {
      const {
        bbox: { west, south, east, north },
      } = props.tile

      return new BitmapLayer(props, {
        data: null,
        image: props.data,
        bounds: [west, south, east, north],
      })
    },
    ...attrs,
  })
}

onMounted(() => {
  const layer = createLayer()
  if (layer && updateLayer) {
    updateLayer(layer)
  }
})

watch(
  () => attrs,
  () => {
    const layer = createLayer()
    if (layer && updateLayer) {
      updateLayer(layer)
    }
  },
  { deep: true }
)
</script>

<template>
  <!-- This component doesn't render anything directly -->
</template>