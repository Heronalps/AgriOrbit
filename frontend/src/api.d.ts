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
    meta: Record<string, any>,
    proct_id: string,
    source: string,
    tags: Array<any>,
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