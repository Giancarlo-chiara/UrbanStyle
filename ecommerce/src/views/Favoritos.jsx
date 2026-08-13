import { motion } from 'framer-motion'
import { Heart, LogIn } from 'lucide-react'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import ProductCard from '../components/ProductCard'
import { Link } from 'react-router-dom'

export default function Favoritos() {
  const { favorites } = useFavorites()
  const { isAuth } = useAuth()

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center">
        <LogIn className="w-16 h-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-400 mb-2">Inicia sesión para ver tus favoritos</h2>
        <p className="text-gray-400 mb-6">Tus productos guardados se sincronizan con tu cuenta.</p>
        <Link to="/login" state={{ from: '/favoritos' }} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          Iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Mis favoritos</h1>
        {!favorites.length ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="w-16 h-16 text-gray-200 mb-4" />
            <h2 className="text-xl font-bold text-gray-400 mb-2">Sin favoritos aún</h2>
            <p className="text-gray-400 mb-6">Guarda los productos que te gusten.</p>
            <Link to="/" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Explorar tienda
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {favorites.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
