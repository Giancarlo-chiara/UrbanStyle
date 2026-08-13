import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Envuelve rutas que requieren sesión iniciada (y opcionalmente rol admin).
 * Uso: <RequireAuth><Profile /></RequireAuth>  o  <RequireAuth adminOnly><Dashboard /></RequireAuth>
 */
export default function RequireAuth({ children, adminOnly = false }) {
  const { isAuth, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>
  }

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
