import axios from '@/http-common'
/*
 * Retrieves all available cropmasks
 */
export async function getAvailableCropmasks() {
  const response = await axios.get('/cropmasks/', {
    params: {
      '18n': 'en',
      tag: 'global',
    },
  })

  const data = await response.data
  return data
}
