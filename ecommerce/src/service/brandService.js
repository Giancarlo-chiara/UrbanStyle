import api from '../config/api.js'

export const getBrands = async () => {
  const response = await api.get('/brands')
  return response.data.data
}
