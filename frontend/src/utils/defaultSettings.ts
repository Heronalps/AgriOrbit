// Define viewStateType interface
interface viewStateType {
  latitude: number
  longitude: number
  zoom: number
  pitch: number
  bearing: number
}

// Define mapStyles type
type mapStyles = (typeof MAP_STYLES)[keyof typeof MAP_STYLES]

export const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  dark: 'mapbox://styles/mapbox/dark-v10',
  light: 'mapbox://styles/mapbox/light-v10',
} as const

export const INITIAL_VIEW_STATE: viewStateType = {
  latitude: 36,
  longitude: -80,
  zoom: 4,
  pitch: 0,
  bearing: 0,
}

interface mapboxSettings {
  container: string
  width: string
  style: mapStyles // Use the defined mapStyles type
  interactive: boolean
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}
export const MAPBOX_SETTINGS: mapboxSettings = {
  container: 'map',
  width: '100%',
  style: MAP_STYLES.dark,
  interactive: false,
  center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
  zoom: INITIAL_VIEW_STATE.zoom,
  bearing: INITIAL_VIEW_STATE.bearing,
  pitch: INITIAL_VIEW_STATE.pitch,
}

export const DECKGL_SETTINGS = {
  canvas: 'deck-canvas',
  width: '100%',
  height: '100%',
  controller: true,

  initialViewState: INITIAL_VIEW_STATE,
}

// useDevicePixels: false,
