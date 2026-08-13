import { useState, useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Package, FolderTree, Tag, Users, ShoppingBag, Boxes, Percent,
  ArrowLeft, Menu, X, Shirt, LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const enlaces = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/categorias', label: 'Categorías', icon: FolderTree },
  { to: '/admin/marcas', label: 'Marcas', icon: Tag },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { to: '/admin/promociones', label: 'Promociones', icon: Percent },
]

function Navegacion({ alNavegar }) {
  return (
    <nav className="flex flex-col gap-1">
      {enlaces.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={alNavegar}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`
          }
        >
          <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function Marca() {
  return (
    <div className="flex items-center gap-2 px-2 mb-6">
      <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
        <Shirt className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-white">UrbanStyle</p>
        <p className="text-[10px] uppercase tracking-widest text-gray-500">Panel admin</p>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()

  // El panel no monta el Navbar de la tienda, así que la barra superior de aquí
  // es la única referencia de "dónde estoy". Antes el layout reservaba 64-80 px
  // (pt-16 lg:pt-20) para compensar un navbar fijo que en /admin no existe: eso
  // dejaba una franja vacía arriba y el sidebar anclado a una barra invisible.
  const seccion = [...enlaces]
    .sort((a, b) => b.to.length - a.to.length)
    .find((e) => (e.end ? location.pathname === e.to : location.pathname.startsWith(e.to)))

  useEffect(() => { setMenuAbierto(false) }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Barra lateral fija (escritorio) */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-gray-900 text-white h-screen sticky top-0 py-6 px-4">
        <Marca />
        <Navegacion />
        <Link
          to="/"
          className="mt-auto flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a la tienda
        </Link>
      </aside>

      {/* Cajón lateral (móvil y tablet) */}
      <AnimatePresence>
        {menuAbierto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuAbierto(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 bg-gray-900 text-white z-50 py-6 px-4 flex flex-col overflow-y-auto"
            >
              <div className="flex items-start justify-between">
                <Marca />
                <button
                  onClick={() => setMenuAbierto(false)}
                  aria-label="Cerrar menú"
                  className="p-1.5 -mt-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <Navegacion alNavegar={() => setMenuAbierto(false)} />
              <Link
                to="/"
                className="mt-auto flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a la tienda
              </Link>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Columna de contenido */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="h-16 px-4 sm:px-8 flex items-center gap-3">
            <button
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Miga de pan, no un título: cada pantalla ya tiene su propio h1.
                Aquí sirve para saber dónde estás, sobre todo en móvil, donde la
                barra lateral está oculta. */}
            <nav aria-label="Ubicación" className="min-w-0 text-sm">
              <span className="text-gray-400 hidden sm:inline">Panel admin</span>
              <span className="text-gray-300 mx-2 hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-medium text-gray-900 truncate">{seccion?.label ?? 'Panel'}</span>
            </nav>

            <div className="ml-auto flex items-center gap-3">
              <Link
                to="/"
                className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Tienda
              </Link>

              <div className="hidden sm:block w-px h-6 bg-gray-200" />

              <div className="text-right leading-tight hidden sm:block">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                  {user?.full_name ?? 'Administrador'}
                </p>
                <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{user?.email}</p>
              </div>

              <button
                onClick={logout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
