import { motion } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import CategoriaIcono from './CategoriaIcono'

// Tope del slider de precio. No oculta nada por sí mismo: mientras el slider
// esté en el máximo no se envía filtro de precio (ver PRECIO_SIN_LIMITE abajo).
const PRECIO_TOPE = 2000

// Orden natural de las tallas de letra; el resto (numéricas, 'Única') se ordena aparte.
const ORDEN_LETRAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const ordenarTallas = (lista) =>
  [...lista].sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    const aEsNum = !Number.isNaN(na)
    const bEsNum = !Number.isNaN(nb)
    if (aEsNum && bEsNum) return na - nb
    if (aEsNum) return -1
    if (bEsNum) return 1
    const ia = ORDEN_LETRAS.indexOf(a)
    const ib = ORDEN_LETRAS.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })

/**
 * Sidebar de filtros. Categorías, marcas Y TALLAS llegan como props,
 * cargadas dinámicamente desde la API (ver Catalog.jsx), en vez de
 * estar hardcodeadas en el componente.
 */
export default function Sidebar({ filters, onFilterChange, onReset, categories = [], brands = [], sizes = [] }) {
  const tallas = ordenarTallas(sizes)
  const precioActual = filters.maxPrice ? Number(filters.maxPrice) : PRECIO_TOPE

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24 self-start"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-900">Filtros</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Limpiar
        </button>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <>
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Categorías</h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => onFilterChange('category', filters.category === cat.slug ? '' : cat.slug)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    filters.category === cat.slug
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CategoriaIcono nombre={cat.icon} size={18} />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-gray-100 mb-6" />
        </>
      )}

      {/* Sizes */}
      {tallas.length > 0 && (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Talla</h3>
        <div className="flex flex-wrap gap-2">
          {tallas.map((s) => (
            <button
              key={s}
              onClick={() => onFilterChange('size', filters.size === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                filters.size === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="h-px bg-gray-100 mb-6" />

      {/* Brands */}
      {brands.length > 0 && (
        <>
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Marca</h3>
            <div className="space-y-2">
              {brands.map((b) => (
                <label key={b.slug} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.brand === b.slug}
                    onChange={() => onFilterChange('brand', filters.brand === b.slug ? '' : b.slug)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className={`text-sm transition-colors ${filters.brand === b.slug ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                    {b.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="h-px bg-gray-100 mb-6" />
        </>
      )}

      {/* Price */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Precio máximo</h3>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>S/ 0</span>
          <span className="font-semibold text-gray-900">
            {filters.maxPrice ? `S/ ${filters.maxPrice}` : 'Sin límite'}
          </span>
        </div>
        <input
          type="range"
          min="50"
          max={PRECIO_TOPE}
          step="50"
          value={precioActual}
          // En el tope se limpia el filtro en lugar de enviar maxPrice=2000,
          // así ningún producto queda escondido por el valor inicial del slider.
          onChange={(e) => {
            const v = Number(e.target.value)
            onFilterChange('maxPrice', v >= PRECIO_TOPE ? '' : String(v))
          }}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>S/ 50</span>
          <span>Sin límite</span>
        </div>
      </div>
    </motion.aside>
  )
}
