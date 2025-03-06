<script setup lang="ts">
import { MAPBOX_SETTINGS } from '@/utils/defaultSettings'
import mapboxgl from 'mapbox-gl'
import { inject, onMounted, useAttrs, watch, ref } from 'vue'
import { useMapStore } from '@/stores/mapStore';

const props = defineProps<{
  accessToken: string
  mapStyle?: string
}>()

const emit = defineEmits(['map-loaded'])

const map = ref(null)
const attrs = useAttrs()
const viewState = inject('viewState')
const mapStore = useMapStore();

onMounted(() => {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error("Mapbox container with ID 'map' not found in the DOM.");
    return;
  }

  mapboxgl.accessToken = props.accessToken;

  map.value = new mapboxgl.Map({
    ...MAPBOX_SETTINGS,
    ...attrs,
    container: 'map',
    style: props.mapStyle,
  });

  map.value.on('load', () => {
    emit('map-loaded', map.value);

    // Synchronize the initial basemap state with the mapStore
    const initialStyleName = map.value.getStyle().name;

    let initialBasemapId = 'dark'; // Default to 'dark' if no match is found
    switch (initialStyleName) {
      case 'Mapbox Streets':
        initialBasemapId = 'streets';
        break;
      case 'Mapbox Outdoors':
        initialBasemapId = 'outdoors';
        break;
      case 'Mapbox Light':
        initialBasemapId = 'light';
        break;
      case 'Mapbox Dark':
        initialBasemapId = 'dark';
        break;
      case 'Mapbox Satellite':
        initialBasemapId = 'satellite';
        break;
      case 'Mapbox Satellite Streets':
        initialBasemapId = 'satellite-streets';
        break;
      case 'Mapbox Navigation Day':
        initialBasemapId = 'navigation-day';
        break;
      case 'Mapbox Navigation Night':
        initialBasemapId = 'navigation-night';
        break;
      default:
        console.warn(`[MapboxView.vue] Unknown initial map style name: ${initialStyleName}. Defaulting to 'dark'.`);
    }

    mapStore.selectedBasemap = initialBasemapId; // Directly set the initial basemap

    // Add dynamic basemap switching based on system preferences
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateBasemapForSystemPreference = (event) => {
      const newBasemap = event.matches ? 'dark' : 'light';
      mapStore.setBasemap(newBasemap);
    };

    darkModeMediaQuery.addEventListener('change', updateBasemapForSystemPreference);

    // Set initial basemap based on system preference
    if (darkModeMediaQuery.matches) {
      mapStore.setBasemap('dark');
    } else {
      mapStore.setBasemap('light');
    }
  });
});

watch(
  () => viewState,
  (state) => {
    handleMapChange(state)
  },
  { deep: true }
)

watch(
  () => mapStore.selectedBasemap,
  (newBasemap) => {
    if (map.value) {
      let styleUrl;

      switch (newBasemap) {
        case 'streets':
          styleUrl = 'mapbox://styles/mapbox/streets-v12';
          break;
        case 'outdoors':
          styleUrl = 'mapbox://styles/mapbox/outdoors-v12';
          break;
        case 'light':
          styleUrl = 'mapbox://styles/mapbox/light-v11';
          break;
        case 'dark':
          styleUrl = 'mapbox://styles/mapbox/dark-v11';
          break;
        case 'satellite':
          styleUrl = 'mapbox://styles/mapbox/satellite-v9';
          break;
        case 'satellite-streets':
          styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12';
          break;
        case 'navigation-day':
          styleUrl = 'mapbox://styles/mapbox/navigation-day-v1';
          break;
        case 'navigation-night':
          styleUrl = 'mapbox://styles/mapbox/navigation-night-v1';
          break;
        default:
          console.warn(`[MapboxView.vue] Unknown basemap: ${newBasemap}. Falling back to 'streets'.`);
          styleUrl = 'mapbox://styles/mapbox/streets-v12';
      }

      map.value.setStyle(styleUrl);

      // Ensure the map is fully loaded before applying additional layers
      map.value.once('styledata', () => {
        // Enforce 2D projection (mercator) to prevent 3D globe rendering
        if (map.value.getProjection().name !== 'mercator') {
          map.value.setProjection({ name: 'mercator' });
        }
      });
    }
  }
);

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