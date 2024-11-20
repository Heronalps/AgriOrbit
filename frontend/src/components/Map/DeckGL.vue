<script setup lang="ts">
import { viewStateType } from '@/shared'
import { DECKGL_SETTINGS } from '@/utils/defaultSettings'
import { Deck } from '@deck.gl/core'
import { onMounted, provide, reactive, useAttrs } from 'vue'

const attrs = useAttrs()
let deck: any = null
const emit = defineEmits(['click'])
const viewState = reactive({
  latitude: 36.102376,
  longitude: -80.649277,
  zoom: 4,
  pitch: 0,
  bearing: 0,
})

onMounted(() => {
  deck = new Deck({
    onViewStateChange: ({ viewState }) => handleViewChange(viewState),
    ...DECKGL_SETTINGS,
    ...attrs,
    onClick: (info, event) => emit('click', { info, event }),
    // onClick: (event, info) => console.log('clicked map', { event, info }),
  })
})

function handleViewChange(newState: viewStateType): void {
  viewState.longitude = newState.longitude
  viewState.latitude = newState.latitude
  viewState.zoom = newState.zoom
}

// function updateLayer(newLayer) {
//   if (!deck) {
//     return
//   }
//   deck.setProps({ layers: [newLayer] })
// }

function updateLayer(newLayer) {
  // Update the layer in your deck instance
  if (deck) {
    deck.setProps({ layers: [newLayer] })
  }
}

provide('viewState', viewState)
provide('updateLayer', updateLayer)
</script>

<template>
  <div class="relative h-full w-full">
    <div class="h-full w-full absolute top-0 left-0">
      <slot></slot>
      <canvas
        id="deck-canvas"
        class="h-full w-full absolute top-0 left-0"
      ></canvas>
    </div>
  </div>
</template>
