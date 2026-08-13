import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, Heart, ShoppingCart, Menu, X, Shirt, LogOut, Package, ShieldCheck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { label: 'Inicio', path: '/' },
  { label: 'Catálogo', path: '/catalogo' },
  { label: 'Ofertas', path: '/ofertas' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { count } = useCart()
  const { favorites } = useFavorites()
  const { isAuth, isAdmin, user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const userMenuRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-white shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <Shirt className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none tracking-tight">UrbanStyle</p>
                <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Fashion Store</p>
              </div>
            </Link>

            {/* Nav links desktop */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    location.pathname === link.path
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                >
                  <ShieldCheck className="w-4 h-4" /> Admin
                </Link>
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label={searchOpen ? 'Cerrar buscador' : 'Buscar productos'}
                aria-expanded={searchOpen}
                className="p-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              >
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* User */}
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={() => (isAuth ? setUserMenuOpen(!userMenuOpen) : navigate('/login'))}
                  aria-label={isAuth ? 'Mi cuenta' : 'Iniciar sesión'}
                  aria-haspopup={isAuth ? 'menu' : undefined}
                  aria-expanded={isAuth ? userMenuOpen : undefined}
                  className="p-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 flex items-center"
                >
                  <User className="w-5 h-5" aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && isAuth && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2"
                    >
                      <p className="px-4 py-2 text-xs text-gray-400 truncate border-b border-gray-50">{user?.email}</p>
                      <Link to="/perfil" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                        <User className="w-4 h-4" /> Mi perfil
                      </Link>
                      <Link to="/pedidos" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                        <Package className="w-4 h-4" /> Mis pedidos
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                        <LogOut className="w-4 h-4" /> Cerrar sesión
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Favorites */}
              <Link
                to="/favoritos"
                aria-label={
                  favorites.length > 0
                    ? `Favoritos, ${favorites.length} ${favorites.length === 1 ? 'producto' : 'productos'}`
                    : 'Favoritos, vacío'
                }
                className="relative p-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 hidden sm:flex"
              >
                <Heart className="w-5 h-5" aria-hidden="true" />
                {favorites.length > 0 && (
                  // min-w + px en lugar de w-4 fijo: con dos dígitos el número
                  // se desbordaba del círculo.
                  <span
                    aria-hidden="true"
                    className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] leading-none font-bold rounded-full flex items-center justify-center"
                  >
                    {favorites.length > 99 ? '99+' : favorites.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/carrito"
                aria-label={
                  count > 0
                    ? `Carrito, ${count} ${count === 1 ? 'artículo' : 'artículos'}`
                    : 'Carrito, vacío'
                }
                className="relative p-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              >
                <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] leading-none font-bold rounded-full flex items-center justify-center"
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={mobileOpen}
                className="lg:hidden p-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 ml-1"
              >
                {mobileOpen
                  ? <X className="w-5 h-5" aria-hidden="true" />
                  : <Menu className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-gray-100"
              >
                <form onSubmit={handleSearchSubmit} className="py-3 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar productos, marcas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Buscar
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
            >
              <nav className="px-4 py-3 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === link.path
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg text-indigo-600 hover:bg-indigo-50">
                    <ShieldCheck className="w-4 h-4" /> Panel admin
                  </Link>
                )}
                <div className="flex gap-2 pt-2 border-t border-gray-100 mt-1">
                  {isAuth ? (
                    <>
                      <Link to="/perfil" className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 bg-gray-50 rounded-lg">
                        <User className="w-4 h-4" /> Mi cuenta
                      </Link>
                      <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-red-500 bg-red-50 rounded-lg">
                        <LogOut className="w-4 h-4" /> Salir
                      </button>
                    </>
                  ) : (
                    <Link to="/login" className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 bg-gray-50 rounded-lg">
                      <User className="w-4 h-4" /> Iniciar sesión
                    </Link>
                  )}
                  <Link to="/favoritos" className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 bg-gray-50 rounded-lg">
                    <Heart className="w-4 h-4" /> Favoritos
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  )
}
