import axios from "@/http-common";
import { selectedProductType } from "@/shared";



export async function getValueAtPoint(selectedProduct: selectedProductType, lon: number, lat: number) {
    
    const {product_id, date, ...params} = selectedProduct

    const URL = `/point/${product_id}/${date.replaceAll('/', '-')}/${lon}/${lat}/`

    const response = await axios.get(URL, {
        ...params
    })
    
    const data = await response.data

    return data

}