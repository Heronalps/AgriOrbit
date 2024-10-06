import BASEURL from "@/api/baseURL";
import { selectedProductType } from "@/shared";



export function computeTileLayerURL(selectedProduct: selectedProductType) {
    
    const { product_id, date, ...paramsObject} = selectedProduct

    if (paramsObject.cropmask_id === 'null'){
        paramsObject.cropmask_id = ''
    }

    if (product_id === undefined || date === undefined) {
        return null
    }

    const URL = BASEURL + `/tiles/${product_id}/${date.replaceAll('/', '-')}/{z}/{x}/{y}.png?`

    const params = new URLSearchParams(paramsObject)

    return URL + params

}