/**
 * Describes user selected Product parameters for API calls
 */
export type SelectedProductParams = {
  product_id: string
  date: string // Expecting format like 'YYYY/MM/DD' or 'YYYY-MM-DD'
  cropmask_id?: string | null // Allow null for 'no-mask' scenarios
  // Add other known dynamic parameters if they are common and have defined types
  // e.g., anomaly?: string;
  [key: string]: unknown // For any other dynamic parameters passed to tile requests etc.
}

/**
 *Describes DeckGL + MapBox viewState
 */
export type viewStateType = {
  latitude: number
  longitude: number
  zoom: number
  pitch: number
  bearing: number
}

/**
 * Interface for describing possible layers
 */
export interface layersInterface {
  tileLayer: Record<string, unknown>
  adminLayer: Record<string, unknown>
}

export type clickedPointType = {
  show: boolean
  value: number
  x: number
  y: number
}
