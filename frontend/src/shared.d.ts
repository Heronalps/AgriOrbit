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

/**
 * Interface for describing clicked point data
 */
export interface ClickedPointType {
  value?: number | null
  x?: number // Screen x-coordinate of the click for popup positioning
  y?: number // Screen y-coordinate of the click for popup positioning
  show?: boolean // Controls visibility of the popup
  longitude?: number // Geographical longitude of the click
  latitude?: number // Geographical latitude of the click
  isLoading?: boolean // True when data for the point is being fetched
  errorMessage?: string | null // Error message if data fetching fails
  [key: string]: unknown // For any other dynamic properties
}

// --- GeoJSON Type Definitions ---

/**
 * Represents a GeoJSON Polygon geometry.
 */
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][] // Array of linear rings (outer ring, then inner rings)
}

/**
 * Represents a generic GeoJSON Feature, which links a geometry to a set of properties.
 * @template G - The type of the geometry (e.g., GeoJSONPolygon).
 * @template P - The type of the properties object.
 */
export interface GeoJSONFeature<G, P = Record<string, unknown>> {
  type: 'Feature'
  geometry: G
  properties: P
}

/**
 * Specific type for the geometry payload expected by the API,
 * which is a GeoJSON Feature containing a Polygon.
 */
export type ApiGeomType = GeoJSONFeature<GeoJSONPolygon>
