import api from '../config/api.js'

export const getCategories = async () => {
  const response = await api.get('/categories')
  return response.data.data
}
