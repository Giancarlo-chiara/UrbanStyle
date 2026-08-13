import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import ProductGrid from '../components/ProductGrid'
import { getProducts } from '../service/productService'

export default function Offers() {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const result = await getProducts({ onSale: 1, sort: 'price_asc', page, limit: 12 })
      setProducts(result.items)
      setPagination(result.pagination)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-2">
          <Flame className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">Ofertas del momento</h1>
        </motion.div>
        <p className="text-sm text-gray-400 mb-8">Descuentos reales cargados directamente desde la base de datos.</p>

        <ProductGrid products={products} loading={loading} />

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {Array.from({ length: pagination.totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => load(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                  pagination.page === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
