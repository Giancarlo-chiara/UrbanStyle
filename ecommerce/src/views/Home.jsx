import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Flame, TrendingUp, Package, Award, LayoutGrid } from 'lucide-react'
import Banner from '../components/Banner'
import ProductGrid from '../components/ProductGrid'
import CategoriaIcono from '../components/CategoriaIcono'
import { getFeaturedProducts, getNewProducts, getOfferProducts, getProducts } from '../service/productService'
import { getCategories } from '../service/categoryService'
import { getBrands } from '../service/brandService'

function SectionHeader({ icon: Icon, title, subtitle, to }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-5 h-5 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
      {to && (
        <Link to={to} className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          Ver todo <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}

export default function Home() {
  const [categories, setCategories] = useState([])
  const [featured, setFeatured] = useState([])
  const [newest, setNewest] = useState([])
  const [offers, setOffers] = useState([])
  const [brands, setBrands] = useState([])
  const [totalProductos, setTotalProductos] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCategories().catch(() => []),
      getFeaturedProducts().catch(() => []),
      getNewProducts().catch(() => []),
      getOfferProducts().catch(() => []),
      getBrands().catch(() => []),
      // limit=1: solo interesa `pagination.total`, no traer el catálogo entero.
      getProducts({ limit: 1 }).then((r) => r.pagination?.total ?? null).catch(() => null),
    ]).then(([cats, feat, news, offs, marcas, total]) => {
      setCategories(cats)
      setFeatured(feat)
      setNewest(news)
      setOffers(offs)
      setBrands(marcas)
      setTotalProductos(total)
      setLoading(false)
    })
  }, [])

  // Cifras del hero calculadas con datos reales de la API (antes eran inventadas).
  const stats = [
    { icon: Package, value: totalProductos ?? '—', label: totalProductos === 1 ? 'Producto' : 'Productos' },
    { icon: Award, value: brands.length || '—', label: brands.length === 1 ? 'Marca' : 'Marcas' },
    { icon: LayoutGrid, value: categories.length || '—', label: categories.length === 1 ? 'Categoría' : 'Categorías' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Banner stats={stats} brands={brands.map((b) => b.name)} />

      {/* Explorar por categoría (dinámico, desde la BD) */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-bold text-gray-900 mb-8 text-center"
          >
            Explora por categoría
          </motion.h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/catalogo?category=${cat.slug}`}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium border bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-all duration-200"
                >
                  <CategoriaIcono nombre={cat.icon} size={20} />
                  {cat.name}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Destacados */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader icon={Sparkles} title="Productos destacados" subtitle="Lo más popular de la temporada" to="/catalogo" />
          <ProductGrid products={featured} loading={loading} />
        </div>
      </section>

      {/* Nuevos */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader icon={TrendingUp} title="Recién llegados" subtitle="Lo último en sumarse a la colección" to="/catalogo" />
          <ProductGrid products={newest} loading={loading} />
        </div>
      </section>

      {/* Ofertas */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader icon={Flame} title="Ofertas del momento" subtitle="Descuentos por tiempo limitado" to="/ofertas" />
          <ProductGrid products={offers} loading={loading} />
        </div>
      </section>
    </div>
  )
}
