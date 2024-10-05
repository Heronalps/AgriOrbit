<script setup lang="ts">
import { TileLayer } from '@deck.gl/geo-layers'
import { BitmapLayer } from '@deck.gl/layers'
import { inject, useAttrs, watch } from 'vue'

const attrs = useAttrs()
const updateLayer = inject('updateLayer')



const layer = createLayer()

watch(
  () => attrs,
  (newVal, oldVal) => {
    createLayer()
  },
  { deep: true }
)

function createLayer(): any {
  updateLayer(
    new TileLayer({
      
      renderSubLayers: (props) => {
        const {
          bbox: { west, south, east, north },
        } = props.tile

        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [west, south, east, north],

          // onClick: (info, event) => emit('click', { info, event }),
        })
      },
      ...attrs,
    })
  )
}
</script>
