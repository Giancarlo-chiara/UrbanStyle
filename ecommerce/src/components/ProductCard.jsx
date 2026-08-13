import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Heart, Eye, Star, X, Plus, Minus, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { getProductById } from "../service/productService";

const badgeStyles = {
  Nuevo: "bg-emerald-100 text-emerald-700",
  Oferta: "bg-blue-100 text-blue-700",
  Agotado: "bg-gray-100 text-gray-500",
};

// Deriva un "badge" visual a partir de los datos reales del producto (sin depender de mock data).
function computeBadge(product) {
  if ((product.stock ?? 0) === 0) return "Agotado";
  if (Number(product.discount_percent) > 0) return "Oferta";
  const createdAt = product.created_at ? new Date(product.created_at) : null;
  if (createdAt && Date.now() - createdAt.getTime() < 1000 * 60 * 60 * 24 * 30) return "Nuevo";
  return null;
}

function RatingStars({ rating, size = "w-3.5 h-3.5" }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${s <= Math.round(rating || 0) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

// ── Modal de detalle rápido ────────────────────────────────────────────────
function ProductModal({ productId, onClose }) {
  const { addItem } = useCart();
  const { toggle, isFavorite } = useFavorites();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProductById(productId)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        if (data?.variants?.length) setSelectedVariant(data.variants[0]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [productId]);

  if (loading || !product) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 text-sm text-gray-400">Cargando producto...</div>
      </div>
    );
  }

  const fav = isFavorite(product.id);
  const stock = selectedVariant?.stock ?? 0;
  const outOfStock = stock === 0;
  const discount = Number(product.discount_percent) > 0 ? Math.round(Number(product.discount_percent)) : null;
  const image = product.images?.[0]?.url;

  const handleAdd = async () => {
    if (outOfStock) return;
    await addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        name: product.name,
        price: Number(product.final_price),
        image,
        brand: product.brand,
        size: selectedVariant?.size,
        color: selectedVariant?.color,
      },
      qty
    );
    onClose();
  };

  const handleFavorite = async () => {
    const res = await toggle(product);
    if (res?.requiresAuth) navigate("/login");
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 30 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row">
            <div className="relative sm:w-72 bg-gray-50 flex items-center justify-center p-8 flex-shrink-0">
              {image && (
            <img
              src={image}
              alt={product.name}
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
              className="w-full max-h-64 object-contain"
            />
          )}
              {computeBadge({ ...product, stock }) && (
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-full ${badgeStyles[computeBadge({ ...product, stock })]}`}
                >
                  {computeBadge({ ...product, stock })}
                </span>
              )}
              {discount && !outOfStock && (
                <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  -{discount}%
                </span>
              )}
            </div>

            <div className="flex-1 p-6 flex flex-col">
              <button
                onClick={onClose}
                className="self-end p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mb-2"
              >
                <X className="w-5 h-5" />
              </button>

              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{product.brand}</span>
              <h2 className="text-xl font-bold text-gray-900 mt-1 mb-1">{product.name}</h2>
              <span className="text-xs text-gray-400 mb-3">{product.category}</span>

              <div className="flex items-center gap-1.5 mb-4">
                <RatingStars rating={product.rating_avg} size="w-4 h-4" />
                <span className="text-sm text-gray-400">
                  {product.rating_avg} ({product.rating_count} reseñas)
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-5">
                <span className="text-2xl font-bold text-gray-900">S/ {Number(product.final_price).toFixed(2)}</span>
                {discount && (
                  <span className="text-base text-gray-400 line-through">S/ {Number(product.price).toFixed(2)}</span>
                )}
              </div>

              {product.variants?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Talla</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        disabled={v.stock === 0}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                          selectedVariant?.id === v.id
                            ? "bg-gray-900 text-white border-gray-900"
                            : "border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {v.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cantidad</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(stock || 10, q + 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-gray-400 ml-1">
                    {stock > 0 ? `${stock} disponibles` : "Agotado"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={handleAdd}
                  disabled={outOfStock}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                    outOfStock
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {outOfStock ? "Agotado" : "Agregar al carrito"}
                </button>
                <button
                  onClick={handleFavorite}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all ${
                    fav ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${fav ? "fill-red-500" : ""}`} />
                </button>
                <Link
                  to={`/producto/${product.id}`}
                  onClick={onClose}
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all"
                  title="Ver página completa"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Tarjeta ───────────────────────────────────────────────────────────────
export default function ProductCard({ product, index = 0 }) {
  const { toggle, isFavorite } = useFavorites();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const fav = isFavorite(product.id);
  const outOfStock = (product.stock ?? 0) === 0;
  const badge = computeBadge(product);

  const discount = Number(product.discount_percent) > 0 ? Math.round(Number(product.discount_percent)) : null;

  // El listado del catálogo NO trae las variantes (solo el stock agregado), así que
  // desde la tarjeta no se puede saber qué talla añadir. Antes se añadía con
  // variantId: null, y eso desactivaba la validación Y el descuento de stock del
  // backend: se podían comprar productos agotados y ningún pedido movía inventario.
  // Ahora abrimos la vista rápida para que el usuario elija la talla.
  const handleQuickAdd = () => {
    if (outOfStock) return;
    setShowModal(true);
  };

  const handleFavorite = async () => {
    const res = await toggle(product);
    if (res?.requiresAuth) navigate("/login");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: index * 0.06 }}
        whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.10)" }}
        className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col"
      >
        <Link to={`/producto/${product.id}`} className="relative overflow-hidden bg-gray-50 aspect-square block">
          {product.image && (
            <motion.img
              src={product.image}
              alt={product.name}
              // El seed sirve todas las imágenes a 400×400. Declararlo evita el
              // salto de maquetación mientras cargan, y `lazy` impide que el
              // catálogo entero se descargue de golpe al abrir la página.
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110 ${outOfStock ? "opacity-50" : ""}`}
            />
          )}
          {badge && (
            <span className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-full ${badgeStyles[badge]}`}>
              {badge}
            </span>
          )}
          {discount && !outOfStock && (
            <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
              -{discount}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              handleFavorite();
            }}
            className="absolute bottom-3 right-3 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <Heart className={`w-4 h-4 transition-colors ${fav ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-gray-900/80 text-white text-sm font-semibold px-4 py-2 rounded-full">Agotado</span>
            </div>
          )}
        </Link>

        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{product.brand}</span>
            <span className="text-xs text-gray-400">{product.category}</span>
          </div>
          <Link to={`/producto/${product.id}`}>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 mb-3">
            <RatingStars rating={product.rating_avg} />
            <span className="text-xs text-gray-400">({product.rating_count ?? 0})</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-lg font-bold text-gray-900">S/ {Number(product.final_price).toFixed(2)}</span>
            {discount && (
              <span className="text-sm text-gray-400 line-through">S/ {Number(product.price).toFixed(2)}</span>
            )}
          </div>
          <div className="flex gap-2 mt-auto">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickAdd}
              disabled={outOfStock}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                outOfStock
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 active:scale-95"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {outOfStock ? "Agotado" : "Elegir talla"}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex-shrink-0"
              title="Ver detalles"
            >
              <Eye className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {showModal && <ProductModal productId={product.id} onClose={() => setShowModal(false)} />}
    </>
  );
}
