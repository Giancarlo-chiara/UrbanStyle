import api from '../config/api.js'

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData)
  return response.data
}

export const getProfile = async () => {
  const response = await api.get('/users/profile')
  return response.data
}

export const updateProfile = async (data) => {
  const response = await api.put('/users/profile', data)
  return response.data
}
