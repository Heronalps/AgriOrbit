
export const MAP_STYLES = {
    SATELLITE: 'mapbox://styles/mapbox/satellite-v9',
    DARK: 'mapbox://styles/mapbox/dark-v10'
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
    width: string,
    style: mapStyles,
    interactive: boolean,
    center: any,
    zoom: number,
    bearing: number,
    pitch: number

}
export const MAPBOX_SETTINGS: mapboxSettings = {
    container: 'map',
    width: '100%',
    style: MAP_STYLES.DARK,
    interactive: false,
    center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
    zoom: INITIAL_VIEW_STATE.zoom,
    bearing: INITIAL_VIEW_STATE.bearing,
    pitch: INITIAL_VIEW_STATE.pitch
}

export const DECKGL_SETTINGS = {
    canvas: "deck-canvas",
    width: "100%",
    height: "100%",
    controller: true,
    
    initialViewState: INITIAL_VIEW_STATE,
}

// useDevicePixels: false,