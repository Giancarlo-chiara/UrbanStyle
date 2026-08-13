import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronDown, LayoutGrid, AlertCircle } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import ProductGrid from '../components/ProductGrid'
import { getProducts, getSizes } from '../service/productService'
import { getCategories } from '../service/categoryService'
import { getBrands } from '../service/brandService'

const sortOptions = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'best_selling', label: 'Más vendidos' },
  { value: 'top_rated', label: 'Mejor calificados' },
]

// maxPrice vacío = sin techo. Antes venía fijado en 600 y se enviaba SIEMPRE,
// así que cualquier producto por encima de S/600 era invisible en el catálogo
// y el usuario no tenía forma de subir el límite (el slider también topaba en 600).
const defaultFilters = {
  category: '',
  brand: '',
  size: '',
  maxPrice: '',
  sort: 'newest',
  search: '',
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    ...defaultFilters,
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
  })
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [sizes, setSizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Texto del buscador separado de los filtros, para poder aplicar debounce.
  const [searchInput, setSearchInput] = useState(filters.search)

  // Categorías, marcas y tallas para el sidebar (dinámicas, desde la BD).
  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]))
    getBrands().then(setBrands).catch(() => setBrands([]))
    getSizes().then(setSizes).catch(() => setSizes([]))
  }, [])

  // URL -> estado. Sin esto, la búsqueda del Navbar (que hace navigate a
  // /catalogo?search=...) no hacía nada si el catálogo ya estaba montado,
  // porque los searchParams solo se leían en el useState inicial.
  useEffect(() => {
    const urlCategory = searchParams.get('category') || ''
    const urlSearch = searchParams.get('search') || ''
    setFilters((prev) =>
      prev.category === urlCategory && prev.search === urlSearch
        ? prev
        : { ...prev, category: urlCategory, search: urlSearch }
    )
    setSearchInput(urlSearch)
  }, [searchParams])

  // Buscador con debounce: antes cada tecla disparaba un GET /products, y las
  // respuestas podían llegar desordenadas y pisarse entre sí.
  useEffect(() => {
    if (searchInput === filters.search) return
    const t = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }))
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const fetchProducts = useCallback(async (currentFilters, page = 1) => {
    setLoading(true)
    setError('')
    try {
      const result = await getProducts({ ...currentFilters, page, limit: 12 })
      setProducts(result.items)
      setPagination(result.pagination)
    } catch {
      // Antes un fallo de red se disfrazaba de "Sin resultados".
      setProducts([])
      setError('No pudimos cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts(filters, 1)
    const params = {}
    if (filters.category) params.category = filters.category
    if (filters.search) params.search = filters.search
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const handleFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }))
  const handleReset = () => {
    setSearchInput('')
    setFilters(defaultFilters)
  }
  const handlePageChange = (page) => {
    fetchProducts(filters, page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Catálogo</h1>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0">
            <Sidebar
              filters={filters}
              onFilterChange={handleFilter}
              onReset={handleReset}
              categories={categories}
              brands={brands}
              sizes={sizes}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilter('sort', e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
                <LayoutGrid className="w-4 h-4" />
                <span>{pagination.total} productos</span>
              </div>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <ProductGrid products={products} loading={loading} />

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                {Array.from({ length: pagination.totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      pagination.page === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
