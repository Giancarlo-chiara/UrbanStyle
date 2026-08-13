import api from '../config/api.js'

// Todas las funciones consumen la API PHP real — ningún producto vive en el código React.

export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.category) params.append('category', filters.category)
  if (filters.brand) params.append('brand', filters.brand)
  if (filters.size) params.append('size', filters.size)
  if (filters.minPrice) params.append('minPrice', filters.minPrice)
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
  if (filters.sort) params.append('sort', filters.sort)
  if (filters.search) params.append('search', filters.search)
  // Estos tres los soporta el backend (ProductRepository::findAll) pero antes se
  // descartaban aquí en silencio: por eso /ofertas listaba el catálogo completo.
  if (filters.onSale) params.append('onSale', 1)
  if (filters.featured) params.append('featured', 1)
  if (filters.isNew) params.append('isNew', 1)
  if (filters.page) params.append('page', filters.page)
  if (filters.limit) params.append('limit', filters.limit)
  const response = await api.get(`/products?${params.toString()}`)
  return response.data.data // { items, pagination }
}

// Tallas realmente presentes en el catálogo (para el filtro del sidebar).
export const getSizes = async () => {
  const response = await api.get('/products/sizes')
  return response.data.data
}

export const getProductById = async (id) => {
  const response = await api.get(`/products/${id}`)
  return response.data.data
}

export const getRelatedProducts = async (id) => {
  const response = await api.get(`/products/${id}/related`)
  return response.data.data
}

export const getFeaturedProducts = async () => {
  const response = await api.get('/products/featured')
  return response.data.data
}

export const getNewProducts = async () => {
  const response = await api.get('/products/new')
  return response.data.data
}

export const getOfferProducts = async () => {
  const response = await api.get('/products/offers')
  return response.data.data
}

