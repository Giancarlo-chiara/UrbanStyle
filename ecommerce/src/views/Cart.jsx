import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { createOrder } from '../service/orderService'
import { calcularEnvio } from '../config/negocio'

export default function Cart() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart()
  const { isAuth } = useAuth()
  const navigate = useNavigate()
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // La regla vive en un único sitio del frontend y está espejada con el backend
  // (antes estaba escrita a pelo aquí y podía divergir sin que nadie lo notara).
  const shipping = calcularEnvio(total)
  const grandTotal = total + shipping

  const handleCheckout = async () => {
    if (!isAuth) {
      navigate('/login', { state: { from: '/carrito' } })
      return
    }
    setPlacing(true)
    setError('')
    try {
      const payload = {
        items: items.map((i) => ({
          product_id: i.productId,
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
        payment_method: 'tarjeta',
      }
      const res = await createOrder(payload)
      setSuccess(res.data)
      clearCart()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo procesar el pedido.')
    } finally {
      setPlacing(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pt-20 px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Pedido realizado!</h2>
          <p className="text-gray-500 mb-1">Tu pedido #{success.id} fue registrado correctamente.</p>
          <p className="text-gray-400 text-sm mb-6">Total: S/ {Number(success.total).toFixed(2)}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/pedidos" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Ver mis pedidos
            </Link>
            <Link to="/" className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Seguir comprando
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pt-20 px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <ShoppingCart className="w-20 h-20 text-gray-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Tu carrito está vacío</h2>
          <p className="text-gray-400 mb-6">Agrega productos para continuar comprando.</p>
          <Link to="/" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Explorar tienda
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Carrito de compras</h1>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            {items.map((item) => (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100"
              >
                {item.image && <img src={item.image} alt={item.name} className="w-20 h-20 object-contain rounded-xl bg-gray-50" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 font-semibold">{item.brand}</p>
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h3>
                  {item.size && <p className="text-xs text-gray-400 mt-0.5">Talla: {item.size}</p>}
                  <p className="text-lg font-bold text-gray-900 mt-1">S/ {Number(item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button onClick={() => removeItem(item.key)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="lg:w-80">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Resumen del pedido</h2>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs px-3 py-2.5 rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>S/ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Envío</span>
                  <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                    {shipping === 0 ? 'Gratis' : `S/ ${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between font-bold text-gray-900 text-lg">
                  <span>Total</span>
                  <span>S/ {grandTotal.toFixed(2)}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={placing}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors mb-3 disabled:opacity-60"
              >
                {placing ? 'Procesando...' : 'Finalizar compra'} <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={clearCart} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Vaciar carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
