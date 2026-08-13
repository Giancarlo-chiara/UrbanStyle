# UrbanStyle — Fashion Store (Frontend)

Tienda virtual moderna de ropa, zapatillas y accesorios. Todo el catálogo,
usuarios, pedidos y demás datos se cargan **dinámicamente desde la API PHP +
PostgreSQL** (ver `../backend` y `../database`) — no hay productos
hardcodeados en el código React.

## 🚀 Instalación

```bash
npm install
cp .env.example .env
# ajusta VITE_API_URL para que apunte a tu backend PHP (ver ../backend/README.md)
npm run dev
```

## 🛠 Stack
- React 18 + Vite
- Tailwind CSS
- Framer Motion
- Axios
- React Router DOM
- Lucide React

## 📁 Estructura
```
src/
  components/        → Navbar, Banner, Sidebar, ProductCard, ProductGrid, Footer, RequireAuth
  components/admin/  → AdminLayout (panel administrativo)
  config/             → configuración de Axios (api.js) con interceptor JWT
  context/            → CartContext (carrito con variantes), FavoritesContext, AuthContext
  service/            → productService, categoryService, brandService, authService,
                        orderService, favoriteService, adminService (CRUD panel admin)
  views/              → Home, Catalog, Offers, ProductDetail, Cart, Login, Register,
                        Favoritos, Profile, Orders
  views/admin/        → Dashboard, Products, Categories, Brands, Users, Orders,
                        Inventory, Promotions (CRUD conectado a /api/admin/...)
```

## 🔗 Conexión con el backend
Todas las llamadas pasan por `src/config/api.js` (Axios) hacia la API definida
en `VITE_API_URL`. Revisa `../backend/README.md` para levantar la API y la
base de datos PostgreSQL antes de usar la tienda.

## 👤 Roles
- **Cliente**: catálogo, carrito, favoritos, checkout, perfil e historial de pedidos.
- **Admin**: además de lo anterior, accede a `/admin` con CRUD completo de
  productos, categorías, marcas, usuarios, pedidos, inventario y promociones.
  El acceso a `/admin` está protegido por `RequireAuth` (rol `admin` en el JWT).
