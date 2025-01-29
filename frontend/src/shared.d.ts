/**
 *  Describes user selected Product 
 */
type selectedProductType = {
    productID: string,
    cropmaskID: string,
    anomaly: AnomolyEnum,
    anomly_type: AnomolyTypeEnum,
    date: Date,
  }

/**
 *Describes DeckGL + MapBox viewState
 */
type viewStateType = {
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
    tileLayer: Record<string, unknown>,
    adminLayer: Record<string, unknown>,
  }


  export type clickedPointType = {
    show: boolean,
    value: number,
    x: number,
    y: number
  }