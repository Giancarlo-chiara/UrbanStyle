import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, ArrowRight } from 'lucide-react'

/**
 * Antes no existía ninguna ruta comodín: una URL mal escrita renderizaba
 * el árbol vacío, o sea una página totalmente en blanco sin Navbar ni Footer,
 * indistinguible de un fallo de JavaScript.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md mx-auto px-4 text-center"
      >
        <Compass className="w-16 h-16 text-gray-200 mx-auto mb-6" />
        <p className="text-sm font-semibold tracking-widest text-blue-600 uppercase mb-2">Error 404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Esta página no existe</h1>
        <p className="text-gray-500 mb-8">
          El enlace que seguiste puede estar roto o la página pudo haberse movido.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Volver al inicio
          </Link>
          <Link
            to="/catalogo"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Explorar el catálogo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
