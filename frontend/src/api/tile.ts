import BASEURL from "@/api/baseURL";
import { selectedProductType } from "@/shared";



export function computeTileLayerURL(selectedProduct: selectedProductType) {
    
    const { product_id, date, ...paramsObject} = selectedProduct

    // If cropmask_id is 'no-mask' or the string 'null', set it to an empty string.
    // This prevents 'no-mask' from being sent and aligns with how 'null' was previously handled.
    if (paramsObject.cropmask_id === 'no-mask' || paramsObject.cropmask_id === 'null') {
        paramsObject.cropmask_id = '';
    }

    if (product_id === undefined || date === undefined) {
        return null
    }

    const URL = BASEURL + `/tiles/${product_id}/${date.replaceAll('/', '-')}/{z}/{x}/{y}.png?`

    const params = new URLSearchParams(paramsObject)

    return URL + params

}