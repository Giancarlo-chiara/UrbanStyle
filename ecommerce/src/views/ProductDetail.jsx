import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, Heart, Star, Plus, Minus, ChevronLeft } from 'lucide-react'
import { getProductById, getRelatedProducts } from '../service/productService'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import ProductGrid from '../components/ProductGrid'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { toggle, isFavorite } = useFavorites()

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setLoading(true)
    getProductById(id)
      .then((data) => {
        setProduct(data)
        if (data?.variants?.length) setSelectedVariant(data.variants[0])
        setActiveImage(0)
      })
      .finally(() => setLoading(false))
    getRelatedProducts(id).then(setRelated).catch(() => setRelated([]))
    window.scrollTo({ top: 0 })
  }, [id])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20 text-gray-400">Cargando producto...</div>
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 text-center px-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Producto no encontrado</h2>
        <Link to="/catalogo" className="text-blue-600 font-medium hover:underline">Volver al catálogo</Link>
      </div>
    )
  }

  const fav = isFavorite(product.id)
  const stock = selectedVariant?.stock ?? 0
  const outOfStock = stock === 0
  const discount = Number(product.discount_percent) > 0 ? Math.round(Number(product.discount_percent)) : null
  const images = product.images?.length ? product.images : [{ url: null }]

  const handleAdd = async () => {
    if (outOfStock) return
    addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        name: product.name,
        price: Number(product.final_price),
        image: images[0]?.url,
        brand: product.brand,
        size: selectedVariant?.size,
        color: selectedVariant?.color,
      },
      qty
    )
  }

  const handleFavorite = async () => {
    const res = await toggle(product)
    if (res?.requiresAuth) navigate('/login')
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/catalogo" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ChevronLeft className="w-4 h-4" /> Volver al catálogo
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Galería */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="bg-gray-50 rounded-2xl aspect-square flex items-center justify-center p-10 mb-4">
              {images[activeImage]?.url && (
                <img
              src={images[activeImage].url}
              alt={product.name}
              width={400}
              height={400}
              // La principal es la imagen más importante de la ficha: se carga
              // con prioridad, no en diferido.
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={img.id ?? i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden ${activeImage === i ? 'border-blue-600' : 'border-gray-200'}`}
                  >
                    <img
                  src={img.url}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{product.brand}</span>
            <h1 className="text-3xl font-bold text-gray-900 mt-1 mb-2">{product.name}</h1>
            <span className="text-sm text-gray-400">{product.category}</span>

            <div className="flex items-center gap-2 mt-4 mb-6">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(product.rating_avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-sm text-gray-400">{product.rating_avg} ({product.rating_count} reseñas)</span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-gray-900">S/ {Number(product.final_price).toFixed(2)}</span>
              {discount && (
                <>
                  <span className="text-lg text-gray-400 line-through">S/ {Number(product.price).toFixed(2)}</span>
                  <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">-{discount}%</span>
                </>
              )}
            </div>

            {product.description && <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>}

            {product.variants?.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Talla</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      disabled={v.stock === 0}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        selectedVariant?.id === v.id ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cantidad</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(stock || 10, q + 1))} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-gray-400 ml-1">{stock > 0 ? `${stock} disponibles` : 'Agotado'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={outOfStock}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all ${
                  outOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {outOfStock ? 'Agotado' : 'Agregar al carrito'}
              </button>
              <button
                onClick={handleFavorite}
                className={`w-14 h-14 flex items-center justify-center rounded-xl border transition-all ${
                  fav ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${fav ? 'fill-red-500' : ''}`} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Relacionados */}
        {related.length > 0 && (
          <div className="mt-20">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Productos relacionados</h2>
            <ProductGrid products={related} loading={false} />
          </div>
        )}
      </div>
    </div>
  )
}
