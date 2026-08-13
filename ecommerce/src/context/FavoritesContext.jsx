import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getFavorites, addFavorite, removeFavorite } from '../service/favoriteService'

const FavoritesContext = createContext()

export const FavoritesProvider = ({ children }) => {
  const { isAuth } = useAuth()
  const [favorites, setFavorites] = useState([])

  // Cuando el usuario inicia sesión, sincroniza sus favoritos guardados en la BD.
  useEffect(() => {
    const load = async () => {
      if (!isAuth) {
        setFavorites([])
        return
      }
      try {
        const res = await getFavorites()
        setFavorites(res || [])
      } catch {
        setFavorites([])
      }
    }
    load()
  }, [isAuth])

  const isFavorite = useCallback((id) => favorites.some((p) => p.id === id), [favorites])

  const toggle = async (product) => {
    if (!isAuth) {
      // Los favoritos requieren sesión: se maneja la redirección desde la UI que llama a toggle.
      return { requiresAuth: true }
    }
    const already = isFavorite(product.id)
    if (already) {
      setFavorites((prev) => prev.filter((p) => p.id !== product.id))
      try {
        await removeFavorite(product.id)
      } catch {
        // revertir en caso de error
        setFavorites((prev) => [...prev, product])
      }
    } else {
      setFavorites((prev) => [...prev, product])
      try {
        await addFavorite(product.id)
      } catch {
        setFavorites((prev) => prev.filter((p) => p.id !== product.id))
      }
    }
    return { requiresAuth: false }
  }

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)
