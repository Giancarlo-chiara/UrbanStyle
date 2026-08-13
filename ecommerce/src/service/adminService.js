import api from '../config/api.js'

// --- Productos ---
/**
 * Resumen del panel en UNA sola petición, con los agregados calculados en SQL.
 * Sustituye a las cuatro llamadas que hacía el Dashboard, dos de las cuales se
 * descargaban tablas enteras (pedidos y usuarios) solo para contarlas con .length.
 */
export const adminGetStats = async (threshold = 5) =>
  (await api.get(`/admin/stats?threshold=${threshold}`)).data.data

export const adminGetProducts = async (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  const response = await api.get(`/admin/products?${qs}`)
  return response.data.data
}
export const adminGetProduct = async (id) => (await api.get(`/admin/products/${id}`)).data.data
export const adminCreateProduct = async (payload) => (await api.post('/admin/products', payload)).data.data
export const adminUpdateProduct = async (id, payload) => (await api.put(`/admin/products/${id}`, payload)).data.data
export const adminDeleteProduct = async (id) => (await api.delete(`/admin/products/${id}`)).data
export const adminAddProductImage = async (id, url, isPrimary = false) =>
  (await api.post(`/admin/products/${id}/images`, { url, is_primary: isPrimary })).data
export const adminRemoveProductImage = async (imageId) => (await api.delete(`/admin/products/images/${imageId}`)).data
export const adminAddVariant = async (id, variant) => (await api.post(`/admin/products/${id}/variants`, variant)).data
export const adminUpdateVariantStock = async (variantId, stock) =>
  (await api.put(`/admin/products/variants/${variantId}`, { stock })).data
export const adminDeleteVariant = async (variantId) => (await api.delete(`/admin/products/variants/${variantId}`)).data

// --- Categorías ---
export const adminGetCategories = async () => (await api.get('/admin/categories')).data.data
export const adminCreateCategory = async (payload) => (await api.post('/admin/categories', payload)).data
export const adminUpdateCategory = async (id, payload) => (await api.put(`/admin/categories/${id}`, payload)).data
export const adminDeleteCategory = async (id) => (await api.delete(`/admin/categories/${id}`)).data

// --- Marcas ---
export const adminGetBrands = async () => (await api.get('/admin/brands')).data.data
export const adminCreateBrand = async (payload) => (await api.post('/admin/brands', payload)).data
export const adminUpdateBrand = async (id, payload) => (await api.put(`/admin/brands/${id}`, payload)).data
export const adminDeleteBrand = async (id) => (await api.delete(`/admin/brands/${id}`)).data

// --- Usuarios ---
export const adminGetUsers = async () => (await api.get('/admin/users')).data.data
export const adminUpdateUserStatus = async (id, status) => (await api.put(`/admin/users/${id}/status`, { status })).data
export const adminUpdateUserRole = async (id, roleId) => (await api.put(`/admin/users/${id}/role`, { role_id: roleId })).data
export const adminDeleteUser = async (id) => (await api.delete(`/admin/users/${id}`)).data

// --- Pedidos ---
export const adminGetOrders = async () => (await api.get('/admin/orders')).data.data
export const adminGetOrder = async (id) => (await api.get(`/admin/orders/${id}`)).data.data
export const adminUpdateOrderStatus = async (id, status, note) =>
  (await api.put(`/admin/orders/${id}/status`, { status, note })).data

// --- Inventario ---
export const adminGetInventory = async () => (await api.get('/admin/inventory')).data.data
export const adminGetLowStock = async (threshold = 5) =>
  (await api.get(`/admin/inventory/low-stock?threshold=${threshold}`)).data.data
export const adminRegisterMovement = async (payload) => (await api.post('/admin/inventory', payload)).data

// --- Promociones ---
export const adminGetPromotions = async () => (await api.get('/admin/promotions')).data.data
export const adminCreatePromotion = async (payload) => (await api.post('/admin/promotions', payload)).data
export const adminUpdatePromotion = async (id, payload) => (await api.put(`/admin/promotions/${id}`, payload)).data
export const adminDeletePromotion = async (id) => (await api.delete(`/admin/promotions/${id}`)).data
