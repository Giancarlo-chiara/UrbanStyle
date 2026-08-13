import axios from 'axios'

// El puerto por defecto debe coincidir con .env.example y con el README:
// el backend se levanta con `php -S localhost:8000` desde backend/public.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Un 401 en /auth/login o /auth/register significa "credenciales incorrectas",
    // NO "sesión expirada". Antes el interceptor recargaba /login en ambos casos y
    // se comía el mensaje de error antes de que la vista pudiera pintarlo.
    const url = error.config?.url || ''
    const esIntentoDeAutenticacion = url.includes('/auth/')

    if (error.response?.status === 401 && !esIntentoDeAutenticacion) {
      localStorage.removeItem('token')
      // Solo expulsamos si el usuario no estaba ya en la pantalla de login.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
