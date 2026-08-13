import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './views/Home'
import Catalog from './views/Catalog'
import Offers from './views/Offers'
import ProductDetail from './views/ProductDetail'
import Cart from './views/Cart'
import Login from './views/Login'
import Register from './views/Register'
import Favoritos from './views/Favoritos'
import Profile from './views/Profile'
import Orders from './views/Orders'
import NotFound from './views/NotFound'

import AdminLayout from './components/admin/AdminLayout'
import Dashboard from './views/admin/Dashboard'
import AdminProducts from './views/admin/Products'
import AdminCategories from './views/admin/Categories'
import AdminBrands from './views/admin/Brands'
import AdminUsers from './views/admin/Users'
import AdminOrders from './views/admin/Orders'
import AdminInventory from './views/admin/Inventory'
import AdminPromotions from './views/admin/Promotions'

// Envuelve las rutas de la tienda con Navbar/Footer (el panel admin usa su propio layout).
function StoreLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    // `reducedMotion="user"` hace que framer-motion obedezca la preferencia del
    // sistema operativo. El CSS de index.css no basta: estas animaciones se
    // aplican por JavaScript como estilos en línea, así que una regla @media
    // no las alcanza.
    <MotionConfig reducedMotion="user">
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <Routes>
              {/* Tienda */}
              <Route path="/" element={<StoreLayout><Home /></StoreLayout>} />
              <Route path="/catalogo" element={<StoreLayout><Catalog /></StoreLayout>} />
              <Route path="/ofertas" element={<StoreLayout><Offers /></StoreLayout>} />
              <Route path="/producto/:id" element={<StoreLayout><ProductDetail /></StoreLayout>} />
              <Route path="/carrito" element={<StoreLayout><Cart /></StoreLayout>} />
              <Route path="/favoritos" element={<StoreLayout><Favoritos /></StoreLayout>} />
              <Route path="/login" element={<StoreLayout><Login /></StoreLayout>} />
              <Route path="/registro" element={<StoreLayout><Register /></StoreLayout>} />
              <Route
                path="/perfil"
                element={
                  <StoreLayout>
                    <RequireAuth><Profile /></RequireAuth>
                  </StoreLayout>
                }
              />
              <Route
                path="/pedidos"
                element={
                  <StoreLayout>
                    <RequireAuth><Orders /></RequireAuth>
                  </StoreLayout>
                }
              />

              {/* Panel administrativo */}
              <Route
                path="/admin"
                element={
                  <RequireAuth adminOnly>
                    <AdminLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="productos" element={<AdminProducts />} />
                <Route path="categorias" element={<AdminCategories />} />
                <Route path="marcas" element={<AdminBrands />} />
                <Route path="usuarios" element={<AdminUsers />} />
                <Route path="pedidos" element={<AdminOrders />} />
                <Route path="inventario" element={<AdminInventory />} />
                <Route path="promociones" element={<AdminPromotions />} />
              </Route>

              {/* Cualquier otra URL */}
              <Route path="*" element={<StoreLayout><NotFound /></StoreLayout>} />
            </Routes>
          </BrowserRouter>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
    </MotionConfig>
  )
}
