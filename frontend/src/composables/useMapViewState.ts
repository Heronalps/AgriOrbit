import { reactive, toRefs } from 'vue'
import type { viewStateType } from '@/shared'

/**
 * Default map view state values
 */
const DEFAULT_VIEW_STATE = {
  latitude: 36.102376,
  longitude: -80.649277,
  zoom: 4,
  pitch: 0,
  bearing: 0,
}

/**
 * Composable for managing the map view state across components
 * Provides a reactive view state object that can be shared between
 * Mapbox and DeckGL components
 */
export function useMapViewState(initialState?: Partial<viewStateType>) {
  // Create reactive view state with defaults and any overrides
  const viewState = reactive<viewStateType>({
    ...DEFAULT_VIEW_STATE,
    ...initialState,
  })

  /**
   * Update view state with new values
   */
  function updateViewState(newState: Partial<viewStateType>): void {
    Object.assign(viewState, newState)
  }

  /**
   * Reset view to default or specified values
   */
  function resetView(resetState?: Partial<viewStateType>): void {
    Object.assign(viewState, {
      ...DEFAULT_VIEW_STATE,
      ...resetState
    })
  }

  /**
   * Zoom to specific coordinates with optional zoom level
   */
  function zoomToLocation(
    longitude: number, 
    latitude: number, 
    zoom?: number
  ): void {
    updateViewState({
      longitude,
      latitude,
      ...(zoom !== undefined ? { zoom } : {})
    })
  }

  return {
    ...toRefs(viewState),  // Make individual properties reactive 
    viewState,             // Provide mutable version to components that need it
    updateViewState,
    resetView,
    zoomToLocation
  }
}
