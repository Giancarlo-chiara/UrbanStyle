import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { useAuth } from './AuthContext'

const CartContext = createContext()

const CLAVE_ALMACEN = 'carrito'

// El carrito vivía solo en memoria: un F5, cerrar la pestaña o cualquier 401
// (que provoca una recarga dura hacia /login) lo vaciaba por completo.
const leerCarritoGuardado = () => {
  try {
    const bruto = localStorage.getItem(CLAVE_ALMACEN)
    if (!bruto) return { items: [] }
    const guardado = JSON.parse(bruto)
    return Array.isArray(guardado?.items) ? { items: guardado.items } : { items: [] }
  } catch {
    return { items: [] }
  }
}

// Cada item del carrito se identifica por producto + variante (talla/color),
// para poder tener el mismo producto en distintas tallas como líneas separadas.
const makeKey = (productId, variantId) => `${productId}-${variantId ?? 'default'}`

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = makeKey(action.payload.productId, action.payload.variantId)
      const exists = state.items.find((i) => i.key === key)
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + action.payload.quantity } : i
          ),
        }
      }
      return { ...state, items: [...state.items, { ...action.payload, key }] }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.key !== action.payload) }
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map((i) =>
          i.key === action.payload.key ? { ...i, quantity: action.payload.quantity } : i
        ),
      }
    case 'CLEAR_CART':
      return { ...state, items: [] }
    default:
      return state
  }
}

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, undefined, leerCarritoGuardado)
  const { isAuth } = useAuth()
  const sesionAnterior = useRef(isAuth)

  const total = state.items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  const count = state.items.reduce((acc, i) => acc + i.quantity, 0)

  // Persistencia
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify({ items: state.items }))
    } catch {
      // almacenamiento lleno o bloqueado: el carrito sigue funcionando en memoria
    }
  }, [state.items])

  // Al cerrar sesión hay que vaciar el carrito: si no, los productos del usuario A
  // seguían en memoria cuando el usuario B iniciaba sesión en la misma pestaña,
  // y se enviaban con SU pedido.
  useEffect(() => {
    if (sesionAnterior.current && !isAuth) {
      dispatch({ type: 'CLEAR_CART' })
    }
    sesionAnterior.current = isAuth
  }, [isAuth])

  /**
   * item: { productId, variantId, name, price, image, brand, size, color }
   */
  const addItem = (item, quantity = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...item, quantity } })
  }

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        total,
        count,
        addItem,
        removeItem: (key) => dispatch({ type: 'REMOVE_ITEM', payload: key }),
        updateQuantity: (key, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { key, quantity } }),
        clearCart: () => dispatch({ type: 'CLEAR_CART' }),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
