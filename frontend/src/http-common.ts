import BASEURL from '@/api/baseURL'
import axios, { AxiosInstance } from 'axios'

const instance: AxiosInstance = axios.create({
  baseURL: BASEURL,
  headers: {
    'Content-type': 'application/json',
  },
})

export default instance
