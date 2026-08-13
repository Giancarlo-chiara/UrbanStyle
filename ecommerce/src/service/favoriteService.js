import api from '../config/api.js'

export const getFavorites = async () => {
  const response = await api.get('/favorites')
  return response.data.data
}

export const addFavorite = async (productId) => {
  const response = await api.post('/favorites', { product_id: productId })
  return response.data
}

export const removeFavorite = async (productId) => {
  const response = await api.delete(`/favorites/${productId}`)
  return response.data
}
