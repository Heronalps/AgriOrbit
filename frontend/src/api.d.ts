/**
 * Describes /product/ return
 */
interface productsType {
    count: number,
    next: null | string,
    previous: null | string,
    results: Array<productType>
 }

/**
 * Interface for the product meta data.
 * Allows for known properties like type, source, crop_type, field_size,
 * and any other dynamic properties.
 */
interface ProductMeta {
  type?: string;
  source?: string;
  crop_type?: string;
  field_size?: string | number;
  [key: string]: unknown; // Allows other properties, requires type checking on use
}

/**
 * Describes /product/ product
 */
type productType = {
    composite: boolean,
    composite_period: number,
    date_added: string,
    date_started: string,
    desc: string,
    display_name: string,
    link: string, 
    meta: ProductMeta, // Replaced Record<string, any> with ProductMeta
    proct_id: string,
    source: string,
    tags: string[], // Replaced Array<any> with string[]
    variable: string
  }



 
/**
 * Enum desrcibing Anomoly options
 */
// enum AnomolyEnum {
//     FIVE = '5day',
//     TEN = '10day',
//     FULL = 'full'
//   }
  
/**
 * Enum describing Anomoly type options
 */
// enum AnomolyTypeEnum {
// MEAN = 'mean',
// MEDIAN = 'median'
// }