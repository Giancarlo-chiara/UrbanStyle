# UrbanStyle — Informe del Proyecto Final Integrador

> **Cómo usar este documento.** Está ordenado exactamente con los puntos del
> *Esquema de Entrega – Proyecto Final Integrador*. Todo lo que aparece aquí está
> verificado contra el código real del repositorio (no contra los README, que en
> varios puntos dicen cosas que el código no hace). Cuando un dato hay que
> **inventarlo o simularlo** para cumplir el esquema, está marcado como
> `[SIMULADO]`, para que no lo presentes como si saliera del sistema.

---

## Cumplimiento del esquema tecnológico

| El esquema pide | El proyecto tiene | |
|---|---|---|
| React + Vite | **React 18.2 + Vite 5** | ✅ |
| Node + Express | **Node 20 + Express 4** (`backend-node/`) | ✅ |
| PostgreSQL + Prisma | **PostgreSQL 13+ con Prisma 6** | ✅ |
| Migraciones con Prisma | **`prisma db pull` + `prisma migrate`** | ✅ |

### Nota sobre la evolución del proyecto — vale la pena contarla en la sustentación

La API se construyó **dos veces**, y la primera versión se conserva en `backend/`
como evidencia:

1. **PHP 8.1 puro, sin framework ni ORM** — router propio por expresiones
   regulares, autoload PSR-4 a mano, JWT implementado desde cero y SQL escrito
   directamente sobre PDO. 2.327 líneas.
2. **Node + Express + Prisma** (`backend-node/`) — la versión actual.

La migración **no cambió el contrato**: las mismas 52 rutas, los mismos códigos
HTTP y los mismos nombres de campo. Prueba de ello es que **el frontend no
necesitó modificar ni un solo archivo**, y que existe un comparador diferencial
(`backend-node/pruebas/comparar.mjs`) que lanza la misma secuencia de peticiones a
ambos backends y contrasta las respuestas: **48 de 48 coinciden**.

Tener las dos implementaciones permite defender con datos por qué el patrón
Controlador → Servicio → Repositorio es independiente del lenguaje, y qué aporta
realmente un ORM: de las 68 sentencias SQL originales, las del CRUD se
sustituyeron por la API de Prisma, y las del catálogo —con subconsultas
correlacionadas y nueve filtros dinámicos— se conservaron con `$queryRaw`, que es
el uso idiomático de Prisma para consultas complejas.

---

# 1. Análisis del Negocio y Planteamiento de la Solución

## 1.1 Contexto del negocio

| Campo | Contenido |
|---|---|
| **Empresa** | UrbanStyle — tienda de moda urbana. **Simulada**, pero con datos coherentes de mercado peruano (precios en soles, `country DEFAULT 'Perú'`, formatos de fecha `es-PE`). |
| **Sector económico** | Comercio minorista (*retail*) de prendas y accesorios de moda urbana. Canal: comercio electrónico B2C. |
| **Catálogo real cargado** | 36 productos, 9 categorías, 6 marcas (Nike, Adidas, Puma, Levis, Zara, H&M), 145 variantes de talla, 755 unidades de stock. |

**Problema identificado.** Una tienda de moda urbana que opera solo en local
tiene tres cuellos de botella verificables en el propio modelo de datos del
sistema:

1. **El inventario por talla no es visible.** El stock no vive en el producto,
   vive en la combinación talla + color (`product_variants`, 145 filas para 36
   productos). Sin sistema, saber si queda una talla 41 exige ir físicamente al
   almacén.
2. **No hay trazabilidad de las existencias.** El sistema modela
   `inventory_movements` con tipo (entrada / salida / ajuste), motivo y autor;
   en una operación manual esa información simplemente no existe.
3. **El pedido no tiene estado ni historia.** El modelo define 6 estados de
   pedido y una tabla `order_status_history`; sin sistema, el cliente no puede
   saber en qué punto está su compra.

**Justificación de la solución digital.** El sistema digitaliza precisamente esos
tres puntos, y los tres son comprobables en el código, no aspiracionales:
consulta de stock por variante en tiempo real, descuento automático de inventario
dentro de una transacción SQL al confirmar el pedido, y registro del cambio de
estado con su nota en cada transición.

## 1.2 Análisis del problema

**Dolor del cliente / necesidad del mercado**

- No puede comprobar disponibilidad por talla antes de desplazarse.
- No puede comparar precios ni descuentos de forma sistemática.
- No tiene historial de sus compras ni forma de guardar productos que le
  interesan (el sistema lo resuelve con `favorites`, que es persistente en base
  de datos, no en el navegador).

**Impacto actual del problema** `[SIMULADO — no hay datos históricos en el sistema]`

Estas cifras hay que declararlas como estimación; el seed no carga ni un solo
pedido, cliente, reseña ni movimiento de inventario (10 de las 17 tablas
arrancan vacías), así que **no existe una línea base medida**.

**Análisis FODA**

| | Favorable | Desfavorable |
|---|---|---|
| **Interno** | **Fortalezas**<br>• Catálogo 100 % dinámico: ni un producto vive en el código React<br>• El precio con descuento lo calcula el motor de base de datos (columna generada `final_price`), no puede desincronizarse<br>• El total del pedido lo recalcula **siempre** el servidor: el cliente no puede manipular precios<br>• Panel administrativo completo (8 pantallas) | **Debilidades**<br>• No hay pasarela de pago: los pedidos nacen en `pendiente` sin cobrar<br>• No hay formulario de dirección de envío (todo pedido queda con `address_id` NULL)<br>• Sin pruebas automatizadas (0 tests)<br>• Sin herramienta de migraciones |
| **Externo** | **Oportunidades**<br>• El modelo ya soporta subcategorías, reseñas, carrito persistente y promociones segmentadas: son extensiones de datos, no de esquema<br>• Base normalizada lista para informes de ventas | **Amenazas**<br>• Competidores con logística y pago ya resueltos<br>• Dependencia total de un CDN externo: las 36 imágenes del catálogo son URL de Unsplash, sin almacenamiento propio ni respaldo |

**Stakeholders**

| Stakeholder | Rol en el sistema | Evidencia en el código |
|---|---|---|
| Cliente final | Rol `cliente` (`role_id = 2`) | Registro fuerza este rol; 21 endpoints accesibles |
| Administrador | Rol `admin` (`role_id = 1`) | 32 endpoints `/api/admin/*`, todos protegidos |
| Encargado de almacén | Opera dentro del rol admin | `inventory_movements.created_by` registra quién movió stock |
| Dueño del negocio | Consumidor del panel de resumen | 4 indicadores en el Dashboard |

## 1.3 Propuesta de valor

**¿Qué solución web se propone?** Una tienda en línea con catálogo dinámico,
control de inventario a nivel de talla y panel administrativo, sobre una API REST
propia y una base de datos relacional normalizada.

**Diferenciación** — tres decisiones de diseño que sí son defendibles porque están
en el código:

1. **El precio de venta es una verdad del motor de datos.** `final_price` es una
   columna `GENERATED ALWAYS AS (ROUND(price - price * discount_percent/100, 2))
   STORED`. Ni PHP ni React pueden escribirla: es imposible que el precio con
   descuento quede desincronizado del precio base.
2. **El stock se descuenta dentro de una transacción SQL.** `OrderRepository::create`
   abre `beginTransaction()`, inserta pedido + líneas + historial y descuenta cada
   variante con la guarda `WHERE stock >= :qty`; cualquier fallo hace `rollBack()`.
3. **El servidor nunca confía en los importes del cliente.** El carrito envía solo
   `{product_id, variant_id, quantity}`. El precio unitario se relee de la base de
   datos en cada checkout.

**Beneficios para el negocio**

| Tipo | Beneficio | Sostenido por |
|---|---|---|
| Operativo | Stock por talla consultable sin ir al almacén | `product_variants` + subconsulta de stock agregado en el listado |
| Operativo | Auditoría de movimientos con motivo y autor | `inventory_movements` |
| Operativo | Alerta de reposición | `GET /api/admin/inventory/low-stock` (umbral configurable, 5 por defecto) |
| Financiero | Descuentos gestionados sin tocar código | `discount_percent` por producto + tabla `promotions` |
| Estratégico | Base normalizada lista para analítica | 17 tablas, 25 claves foráneas, snapshot de precio en `order_items` |

## 1.4 Modelado del negocio

**Business Model Canvas (resumido)**

| Bloque | Contenido |
|---|---|
| Segmentos de cliente | Consumidor joven urbano; compra por talla y marca |
| Propuesta de valor | Catálogo con disponibilidad real por talla, ofertas visibles, historial de pedidos |
| Canales | Web responsive (móvil, tablet, escritorio) |
| Relación con clientes | Autoservicio: cuenta propia, favoritos, historial |
| Fuentes de ingreso | Venta directa. Envío gratis desde S/ 200, si no S/ 15 |
| Recursos clave | Catálogo, inventario por variante, base PostgreSQL |
| Actividades clave | Gestión de catálogo, control de stock, atención de pedidos |
| Socios clave | Marcas proveedoras (6), CDN de imágenes |
| Estructura de costos | Hosting, mercadería, logística de entrega |

**Procesos digitalizados** (los 8 que el código implementa de verdad)

1. Publicación y mantenimiento del catálogo (CRUD de producto, imágenes, variantes)
2. Búsqueda y filtrado del catálogo (9 filtros + 5 ordenamientos + paginación)
3. Registro y autenticación de clientes (JWT)
4. Gestión de lista de deseos (favoritos persistentes)
5. Armado de carrito y confirmación de pedido, con descuento de stock transaccional
6. Seguimiento del estado del pedido (6 estados + historial)
7. Control y auditoría de inventario (entradas, salidas, ajustes, stock bajo)
8. Gestión de promociones por código

> **No digitalizado**, y conviene decirlo antes de que lo pregunten: cobro
> electrónico, cálculo de envío por dirección, facturación, devoluciones y
> reseñas de producto (la tabla existe, sin endpoints).

**Indicadores clave (KPIs)**

Estos cuatro son **medibles hoy** con los datos que el sistema ya guarda:

| KPI | Cómo se calcula | Datos disponibles |
|---|---|---|
| Ticket promedio | `AVG(total)` sobre `orders` | ✅ |
| Tasa de conversión por estado | `orders` agrupado por `status` | ✅ |
| Rotación por variante | `SUM(quantity)` de `order_items` por `variant_id` | ✅ |
| Variantes bajo mínimo | `COUNT` de `product_variants` con `stock <= 5` | ✅ Ya expuesto por API |

Estos **no** son medibles y no conviene prometerlos: tasa de abandono de carrito
(el carrito no se persiste en servidor), origen de tráfico, y margen (no hay
columna de costo).

---

# 2. Arquitectura de la Solución y Diseño del Sistema

## 2.1 Arquitectura general

Arquitectura **cliente-servidor de tres capas**, con separación física de
frontend, backend y base de datos, comunicadas por HTTP/JSON y por el protocolo
nativo de PostgreSQL.

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENTE  —  Navegador                                               │
│  React 18 + Vite 5 + Tailwind 3   ·   http://localhost:5173          │
│                                                                      │
│  Vistas (18)                                                         │
│      Tienda: Home, Catálogo, Detalle, Carrito, Favoritos,            │
│              Ofertas, Pedidos, Login, Registro, Perfil, 404          │
│      Admin:  Resumen, Productos, Categorías, Marcas, Usuarios,       │
│              Pedidos, Inventario, Promociones                        │
│                             │                                        │
│  Estado global   AuthContext · CartContext · FavoritesContext         │
│                             │                                        │
│  Capa de servicios (7)      productService, authService, orderService,│
│                             favoriteService, categoryService,        │
│                             brandService, adminService               │
│                             │                                        │
│  config/api.js  —  única instancia de axios                          │
│                    interceptor ► inyecta  Authorization: Bearer      │
│                    interceptor ◄ 401 = sesión expirada → /login      │
└─────────────────────────────┬────────────────────────────────────────┘
                              │  HTTP / JSON   (CORS)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  SERVIDOR  —  API REST en PHP 8 puro   ·   http://localhost:8000/api │
│                                                                      │
│  public/index.php   Front controller único                           │
│     1. Autoload PSR-4 manual (App\ → src/)                           │
│     2. Env::load(.env)                                               │
│     3. CorsMiddleware  (preflight OPTIONS → 204)                     │
│     4. set_exception_handler global → 500 JSON                       │
│     5. Inyección de dependencias manual (8 repos, 9 srv, 14 ctrl)    │
│     6. Tabla de 52 rutas                                             │
│     7. dispatch()                                                    │
│                             │                                        │
│  Middleware      JwtAuthMiddleware (401)  →  AdminMiddleware (403)   │
│                             │                                        │
│  Controllers (14)   validan entrada y traducen a HTTP                │
│                             │                                        │
│  Services (9)       reglas de negocio (checkout, hash, JWT, slug)    │
│                             │                                        │
│  Repositories (8)   TODO el SQL, con consultas preparadas            │
│                             │                                        │
│  Utils   Response · Request · JwtHandler (HS256) · Validator         │
└─────────────────────────────┬────────────────────────────────────────┘
                              │  PDO  (pdo_pgsql, EMULATE_PREPARES=false)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DATOS  —  PostgreSQL 13+   ·   base  urbanstyle                     │
│                                                                      │
│  17 tablas · 25 claves foráneas · 14 índices                         │
│  1 columna generada (products.final_price)                           │
│  1 función plpgsql + 3 triggers (updated_at)                         │
└──────────────────────────────────────────────────────────────────────┘
```

**Flujo de una petición de punta a punta**

*Lectura* — `GET /api/products?category=zapatillas&sort=price_asc`
`Catalog.jsx` → `productService.getProducts()` → axios (añade Bearer si existe) →
`index.php` → CORS → Router casa la ruta → `ProductController::index` →
`ProductService::list` → `ProductRepository::findAll` + `countAll` →
2 consultas SQL preparadas → `Response::success` →
`{success, message, data:{items, pagination}}`.

*Escritura* — `POST /api/orders`
`Cart.jsx` envía solo `{items:[{product_id, variant_id, quantity}], payment_method}` →
`JwtAuthMiddleware` valida el JWT y publica el usuario → `OrderController::store` →
`OrderService::checkout` **relee el precio de la base de datos**, valida cantidad,
comprueba que la variante pertenece al producto y que hay stock, aplica promoción y
calcula el envío → `OrderRepository::create` abre transacción, inserta pedido,
líneas e historial y descuenta stock → `commit` → 201 con el pedido.

**Justificación tecnológica**

| Capa | Elección | Por qué |
|---|---|---|
| Frontend | **React 18** | Interfaz por componentes; el catálogo, la tarjeta de producto y la cuadrícula se reutilizan en 5 vistas |
| Build | **Vite 5** | Arranque en frío casi inmediato y HMR; el build de producción son 462 kB (135 kB con gzip) |
| Rutas | **React Router 6** | SPA con rutas anidadas: `/admin` usa `<Outlet/>` con layout propio |
| Estilos | **Tailwind 3** | Utilidades en el marcado; responsive con los breakpoints estándar |
| HTTP | **Axios** | Interceptores: el token y el manejo del 401 se resuelven en un solo archivo |
| Animación | **Framer Motion** | Transiciones de entrada, modales y reordenado del carrito |
| Backend | **PHP 8.1 puro** | Sin framework: obliga a implementar a mano el router, la inyección de dependencias, el JWT y la separación en capas. Es la decisión que más se puede defender técnicamente |
| Acceso a datos | **PDO con `EMULATE_PREPARES=false`** | Consultas preparadas reales del servidor: protección contra inyección SQL |
| Base de datos | **PostgreSQL 13+** | Columnas generadas, `TIMESTAMPTZ`, `NUMERIC` exacto para dinero, `ILIKE` para búsqueda sin distinguir mayúsculas |
| Autenticación | **JWT HS256 propio** | Sin estado; firma con `hash_hmac` y comparación con `hash_equals` (tiempo constante) |

## 2.2 Diseño de base de datos

### Modelo Entidad-Relación

```
                    ┌────────┐
                    │ roles  │ 1
                    └───┬────┘
                        │ N
                    ┌───▼────┐ 1        N ┌───────────┐
                    │ users  ├────────────► addresses │
                    └───┬────┘            └─────┬─────┘
           ┌────────────┼────────────┐          │ N
           │ 1          │ 1          │ N        │
     ┌─────▼─────┐ ┌────▼────┐  ┌────▼─────┐    │ 1
     │  carts    │ │favorites│  │  orders  ◄────┘
     └─────┬─────┘ └────┬────┘  └────┬─────┘
           │ N          │ N          │ 1
     ┌─────▼──────┐     │       ┌────┴──────────────┐
     │ cart_items │     │       │ N               N │
     └─────┬──────┘     │  ┌────▼───────┐  ┌────────▼──────────────┐
           │ N          │  │order_items │  │ order_status_history  │
           │            │  └────┬───────┘  └───────────────────────┘
     ┌─────▼────────────▼───────▼────┐
     │      product_variants         │◄── N ── inventory_movements
     └─────────────┬─────────────────┘
                   │ N
             ┌─────▼──────┐ 1      N ┌────────────────┐
             │  products  ├──────────► product_images │
             └──┬───┬───┬─┘          └────────────────┘
                │ N │ N │ N
        ┌───────▼┐ ┌▼─────────┐ ┌▼─────────────────┐
        │ brands │ │categories│ │ product_reviews  │
        └────────┘ └────┬─────┘ └──────────────────┘
                        │ parent_id (auto-referencia jerárquica)
                        └──► categories
```

**Cardinalidades y particularidades**

- **1:N (17 relaciones).** Destacan dos casos que conviene explicar en la
  defensa: `products` tiene **dos** claves foráneas a `categories`
  (`category_id` obligatoria con `ON DELETE RESTRICT`, `subcategory_id` opcional
  con `SET NULL`), y `categories.parent_id` se **auto-referencia** para permitir
  subcategorías.
- **1:1 (1 relación).** `carts → users`: el `UNIQUE` sobre `user_id` es lo que
  fuerza el uno a uno.
- **N:M (4 tablas puente).** `favorites` (puente puro, clave primaria compuesta
  y sin `id`), `product_reviews` (con atributos `rating` y `comment`),
  `cart_items` (con `quantity`) y `order_items` (con precio, cantidad y
  snapshot del nombre).
- **Política de borrado explícita en las 25 claves foráneas.** `CASCADE` para lo
  que depende del padre (imágenes, variantes, favoritos), `RESTRICT` para lo que
  no debe perderse (un usuario con pedidos y un producto vendido **no se pueden
  borrar**), y `SET NULL` para referencias opcionales (dirección de un pedido,
  autor de un movimiento de inventario).

### Diccionario de datos

**roles** — catálogo de roles
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | SMALLSERIAL | PK | Identificador |
| name | VARCHAR(30) | NOT NULL, UNIQUE | `admin` \| `cliente` |

**users** — cuentas del sistema
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| role_id | SMALLINT | NOT NULL, FK→roles, DEFAULT 2 | Rol; 2 = cliente |
| full_name | VARCHAR(150) | NOT NULL | Nombre completo |
| email | VARCHAR(150) | NOT NULL, UNIQUE | Credencial de acceso |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt (`password_hash`, coste 10) |
| phone | VARCHAR(20) | NULL | Teléfono de contacto |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'activo' | `activo` \| `inactivo` \| `bloqueado`. Solo `activo` puede iniciar sesión |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | `updated_at` mantenido por trigger |

**addresses** — direcciones de envío
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| user_id | BIGINT | NOT NULL, FK→users CASCADE | Propietario |
| recipient_name | VARCHAR(150) | NOT NULL | Quién recibe |
| address_line | VARCHAR(255) | NOT NULL | Calle y número |
| district / city / region | VARCHAR(100) | city NOT NULL | Ubicación |
| postal_code | VARCHAR(20) | NULL | Código postal |
| country | VARCHAR(80) | NOT NULL, DEFAULT 'Perú' | País |
| phone | VARCHAR(20) | NULL | Teléfono de entrega |
| is_default | BOOLEAN | NOT NULL, DEFAULT FALSE | Dirección preferida |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Alta |

**brands** — marcas
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Nombre comercial |
| slug | VARCHAR(120) | NOT NULL, UNIQUE | Identificador para URL y filtros |
| logo_url | VARCHAR(500) | NULL | Logotipo |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'activo' | Visibilidad en tienda |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Alta |

**categories** — categorías jerárquicas
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| parent_id | BIGINT | NULL, FK→categories CASCADE | Categoría madre (auto-referencia) |
| name | VARCHAR(100) | NOT NULL | Nombre visible |
| slug | VARCHAR(120) | NOT NULL, UNIQUE | Identificador para URL y filtros |
| icon | VARCHAR(40) | NULL | Nombre del icono mostrado en la interfaz (p. ej. `zapatilla`), resuelto a un componente en `CategoriaIcono.jsx` |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'activo' | Visibilidad en tienda |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Alta |

**products** — tabla central del catálogo
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| category_id | BIGINT | NOT NULL, FK→categories RESTRICT | Categoría principal |
| subcategory_id | BIGINT | NULL, FK→categories SET NULL | Subcategoría opcional |
| brand_id | BIGINT | NOT NULL, FK→brands RESTRICT | Marca |
| name | VARCHAR(200) | NOT NULL | Nombre comercial |
| slug | VARCHAR(220) | NOT NULL, UNIQUE | Identificador para URL |
| description | TEXT | NULL | Descripción larga |
| price | NUMERIC(10,2) | NOT NULL, CHECK ≥ 0 | Precio de lista |
| discount_percent | NUMERIC(5,2) | NOT NULL, DEFAULT 0, CHECK 0–100 | Descuento vigente |
| **final_price** | NUMERIC(10,2) | **GENERATED ALWAYS ... STORED** | `ROUND(price − price·discount_percent/100, 2)`. **Solo escribible por el motor** |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'activo' | `activo` \| `inactivo` \| `agotado` |
| is_featured | BOOLEAN | NOT NULL, DEFAULT FALSE | Aparece en destacados |
| rating_avg | NUMERIC(3,2) | NOT NULL, DEFAULT 0 | Media de valoraciones (desnormalizado) |
| rating_count | INTEGER | NOT NULL, DEFAULT 0 | Nº de valoraciones (desnormalizado) |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | `updated_at` por trigger |

**product_images** — galería
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| product_id | BIGINT | NOT NULL, FK→products CASCADE | Producto |
| url | VARCHAR(500) | NOT NULL | Dirección de la imagen |
| is_primary | BOOLEAN | NOT NULL, DEFAULT FALSE | Portada |
| sort_order | SMALLINT | NOT NULL, DEFAULT 0 | Orden en la galería |

**product_variants** — **aquí vive el stock**
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| product_id | BIGINT | NOT NULL, FK→products CASCADE | Producto |
| size | VARCHAR(20) | NOT NULL, DEFAULT 'Única' | Talla |
| color | VARCHAR(40) | NOT NULL, DEFAULT 'Estándar' | Color |
| sku | VARCHAR(80) | UNIQUE, NULL | Código de almacén |
| stock | INTEGER | NOT NULL, DEFAULT 0, **CHECK ≥ 0** | Unidades disponibles |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Alta |
| — | — | **UNIQUE (product_id, size, color)** | Clave natural de la variante |

**product_reviews** — valoraciones *(modelada, sin endpoints)*
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| product_id | BIGINT | NOT NULL, FK→products CASCADE | Producto valorado |
| user_id | BIGINT | NOT NULL, FK→users CASCADE | Autor |
| rating | SMALLINT | NOT NULL, CHECK 1–5 | Puntuación |
| comment | TEXT | NULL | Comentario |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Fecha |
| — | — | UNIQUE (product_id, user_id) | Una reseña por cliente y producto |

**favorites** — lista de deseos (N:M puro)
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| user_id | BIGINT | **PK compuesta**, FK→users CASCADE | Cliente |
| product_id | BIGINT | **PK compuesta**, FK→products CASCADE | Producto |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Fecha en que se marcó |

**carts / cart_items** — carrito persistente *(modelado, el frontend usa carrito local)*
| Tabla.Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| carts.id | BIGSERIAL | PK | Identificador |
| carts.user_id | BIGINT | NOT NULL, **UNIQUE**, FK→users CASCADE | Dueño (fuerza el 1:1) |
| carts.updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Última modificación |
| cart_items.id | BIGSERIAL | PK | Identificador |
| cart_items.cart_id | BIGINT | NOT NULL, FK→carts CASCADE | Carrito |
| cart_items.variant_id | BIGINT | NOT NULL, FK→product_variants CASCADE | Variante elegida |
| cart_items.quantity | INTEGER | NOT NULL, DEFAULT 1, CHECK > 0 | Unidades |
| — | — | UNIQUE (cart_id, variant_id) | Una línea por variante |

**orders** — cabecera del pedido
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Nº de pedido |
| user_id | BIGINT | NOT NULL, FK→users **RESTRICT** | Cliente; protege el histórico |
| address_id | BIGINT | NULL, FK→addresses SET NULL | Dirección de envío |
| subtotal | NUMERIC(10,2) | NOT NULL | Suma de líneas |
| discount_total | NUMERIC(10,2) | NOT NULL, DEFAULT 0 | Descuento por promoción |
| shipping_cost | NUMERIC(10,2) | NOT NULL, DEFAULT 0 | Envío |
| total | NUMERIC(10,2) | NOT NULL | Importe final cobrado |
| status | VARCHAR(30) | NOT NULL, DEFAULT 'pendiente' | `pendiente`\|`pagado`\|`procesando`\|`enviado`\|`entregado`\|`cancelado` |
| payment_method | VARCHAR(40) | NOT NULL, DEFAULT 'tarjeta' | Medio de pago |
| promotion_code | VARCHAR(40) | NULL | Cupón aplicado |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | `updated_at` por trigger |

**order_items** — líneas del pedido, con snapshot
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| order_id | BIGINT | NOT NULL, FK→orders CASCADE | Pedido |
| product_id | BIGINT | NOT NULL, FK→products **RESTRICT** | Producto vendido |
| variant_id | BIGINT | NULL, FK→product_variants SET NULL | Variante vendida |
| product_name_snapshot | VARCHAR(200) | NOT NULL | Nombre **congelado** al comprar |
| unit_price | NUMERIC(10,2) | NOT NULL | Precio unitario **congelado** |
| quantity | INTEGER | NOT NULL, CHECK > 0 | Unidades |
| subtotal | NUMERIC(10,2) | NOT NULL | `unit_price × quantity` |

**order_status_history** — trazabilidad del pedido
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| order_id | BIGINT | NOT NULL, FK→orders CASCADE | Pedido |
| status | VARCHAR(30) | NOT NULL | Estado al que se pasó |
| note | VARCHAR(255) | NULL | Observación del operador |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Momento del cambio |

**inventory_movements** — auditoría de existencias
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| variant_id | BIGINT | NOT NULL, FK→product_variants CASCADE | Variante afectada |
| type | VARCHAR(20) | NOT NULL | `entrada` \| `salida` \| `ajuste` |
| quantity | INTEGER | NOT NULL | Unidades del movimiento |
| reason | VARCHAR(255) | NULL | Motivo |
| created_by | BIGINT | NULL, FK→users SET NULL | Quién lo registró |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Fecha |

**promotions** — cupones
| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGSERIAL | PK | Identificador |
| code | VARCHAR(40) | NOT NULL, UNIQUE | Código que teclea el cliente |
| description | VARCHAR(255) | NULL | Descripción comercial |
| discount_percent | NUMERIC(5,2) | NULL, CHECK 0–100 | Descuento porcentual |
| discount_amount | NUMERIC(10,2) | NULL | Descuento en soles |
| applies_to | VARCHAR(20) | NOT NULL, DEFAULT 'todo' | `todo` \| `categoria` \| `producto` |
| category_id | BIGINT | NULL, FK→categories CASCADE | Alcance por categoría |
| product_id | BIGINT | NULL, FK→products CASCADE | Alcance por producto |
| starts_at / ends_at | TIMESTAMPTZ | NULL | Vigencia |
| active | BOOLEAN | NOT NULL, DEFAULT TRUE | Interruptor manual |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Alta |

### Justificación de las entidades principales

| Entidad | Por qué existe como tabla propia |
|---|---|
| `product_variants` | El stock de moda **no** es del producto, es de la talla. Sin esta tabla no se puede responder "¿queda talla 41?", que es la pregunta central del negocio |
| `order_items` con snapshot | Una factura no puede cambiar cuando cambia el catálogo: se congelan nombre y precio unitario |
| `order_status_history` | La trazabilidad exige saber *cuándo* cambió cada estado y *por qué*, no solo el estado actual |
| `inventory_movements` | Separa el **saldo** (`product_variants.stock`) del **libro mayor** de movimientos: sin ella no hay auditoría |
| `categories` auto-referenciada | Permite un árbol de profundidad arbitraria sin cambiar el esquema |
| `favorites` con PK compuesta | La unicidad "un cliente marca un producto una sola vez" la garantiza el motor, no el código de la aplicación |

## 2.3 Diseño de API

**Convenciones.** Base `/api`. Todo el cuerpo es JSON. La autenticación viaja en
`Authorization: Bearer <jwt>`. Toda respuesta usa el mismo envoltorio.

```json
// Éxito
{ "success": true,  "message": "OK",              "data": { } }
// Error
{ "success": false, "message": "Datos inválidos.", "errors": { } }
```

### Endpoints

**Catálogo — público (10)**
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Comprobación de servicio |
| GET | `/api/products` | Listado con 9 filtros, 5 ordenamientos y paginación |
| GET | `/api/products/featured` | 8 destacados |
| GET | `/api/products/new` | 8 novedades (últimos 30 días) |
| GET | `/api/products/offers` | 12 productos con descuento |
| GET | `/api/products/sizes` | Tallas existentes en el catálogo |
| GET | `/api/products/{id}` | Detalle: producto + imágenes + variantes |
| GET | `/api/products/{id}/related` | 4 productos de la misma categoría |
| GET | `/api/categories` | Categorías activas |
| GET | `/api/brands` | Marcas activas |

**Autenticación y cuenta (4)**
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | — | Registro de cliente, devuelve JWT |
| POST | `/api/auth/login` | — | Inicio de sesión, devuelve JWT |
| GET | `/api/users/profile` | Cliente | Perfil propio |
| PUT | `/api/users/profile` | Cliente | Actualiza nombre y teléfono |

**Pedidos y favoritos (6)**
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/orders` | Cliente | Confirma el pedido; descuenta stock |
| GET | `/api/orders` | Cliente | Historial propio |
| GET | `/api/orders/{id}` | Cliente | Detalle (solo si el pedido es suyo) |
| GET | `/api/favorites` | Cliente | Lista de deseos |
| POST | `/api/favorites` | Cliente | Añade `{product_id}` |
| DELETE | `/api/favorites/{productId}` | Cliente | Quita de la lista |

**Panel administrativo (32) — todas exigen JWT + rol `admin`**
| Método | Ruta | Descripción |
|---|---|---|
| GET / POST | `/api/admin/products` | Listar (incluye inactivos) / crear |
| GET / PUT / DELETE | `/api/admin/products/{id}` | Detalle / actualizar / eliminar |
| POST | `/api/admin/products/{id}/images` | Añadir imagen por URL |
| DELETE | `/api/admin/products/images/{imageId}` | Quitar imagen |
| POST | `/api/admin/products/{id}/variants` | Crear variante talla/color/stock |
| PUT / DELETE | `/api/admin/products/variants/{variantId}` | Ajustar stock / eliminar |
| GET / POST | `/api/admin/categories` | Listar (todas) / crear |
| PUT / DELETE | `/api/admin/categories/{id}` | Actualizar / eliminar |
| GET / POST | `/api/admin/brands` | Listar (todas) / crear |
| PUT / DELETE | `/api/admin/brands/{id}` | Actualizar / eliminar |
| GET | `/api/admin/users` | Listar clientes y administradores |
| PUT | `/api/admin/users/{id}/status` | Activar / bloquear |
| PUT | `/api/admin/users/{id}/role` | Cambiar rol |
| DELETE | `/api/admin/users/{id}` | Eliminar |
| GET | `/api/admin/orders` | Todos los pedidos con datos del cliente |
| GET | `/api/admin/orders/{id}` | Detalle con líneas |
| PUT | `/api/admin/orders/{id}/status` | Cambiar estado (+ nota) |
| GET | `/api/admin/inventory` | Bitácora (últimos 200 movimientos) |
| GET | `/api/admin/inventory/low-stock` | Variantes bajo umbral |
| POST | `/api/admin/inventory` | Registrar entrada / salida / ajuste |
| GET / POST | `/api/admin/promotions` | Listar / crear cupón |
| PUT / DELETE | `/api/admin/promotions/{id}` | Actualizar / eliminar |

**Resumen:** 52 rutas · 27 GET, 11 POST, 9 PUT, 5 DELETE · 14 públicas, 6 de
cliente autenticado, 32 de administrador.

### Estructura de petición y respuesta

`POST /api/auth/register`
```json
// Petición
{ "full_name": "Ana Torres", "email": "ana@correo.com",
  "password": "secreta123", "phone": "987654321" }
// Respuesta 201
{ "success": true, "message": "Cuenta creada exitosamente.",
  "data": { "user": { "id": 2, "full_name": "Ana Torres",
                      "email": "ana@correo.com", "phone": "987654321",
                      "status": "activo", "created_at": "2026-08-12T10:15:00-05:00",
                      "role": "cliente" },
            "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...." } }
```

`GET /api/products?category=zapatillas&sort=price_asc&page=1&limit=12`
```json
{ "success": true, "message": "OK",
  "data": {
    "items": [
      { "id": 1, "name": "Air Force 1 Classic", "slug": "air-force-1-classic-1",
        "price": "349.90", "discount_percent": "18.61", "final_price": "284.80",
        "status": "activo", "is_featured": false,
        "rating_avg": "4.80", "rating_count": 124,
        "category": "Zapatillas", "category_slug": "zapatillas",
        "brand": "Nike", "brand_slug": "nike",
        "image": "https://images.unsplash.com/...", "stock": 14 }
    ],
    "pagination": { "page": 1, "limit": 12, "total": 7, "totalPages": 1 } } }
```

`GET /api/products/1` — añade al objeto anterior:
```json
"images":   [ { "id": 1, "url": "https://...", "is_primary": true, "sort_order": 0 } ],
"variants": [ { "id": 1, "size": "38", "color": "Estándar", "sku": "SKU-1-38", "stock": 3 } ]
```

`POST /api/orders` — **el cliente no envía ningún importe**
```json
// Petición
{ "items": [ { "product_id": 1, "variant_id": 3, "quantity": 2 } ],
  "payment_method": "tarjeta", "promotion_code": "BIENVENIDA10" }
// Respuesta 201
{ "success": true, "message": "Pedido creado exitosamente.",
  "data": { "id": 1, "user_id": 2, "address_id": null,
            "subtotal": "569.60", "discount_total": "56.96",
            "shipping_cost": "0.00", "total": "512.64",
            "status": "pendiente", "payment_method": "tarjeta",
            "promotion_code": "BIENVENIDA10",
            "items": [ { "id": 1, "order_id": 1, "product_id": 1, "variant_id": 3,
                         "product_name_snapshot": "Air Force 1 Classic",
                         "unit_price": "284.80", "quantity": 2,
                         "subtotal": "569.60" } ] } }
```

### Manejo de errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 400 | Regla de negocio incumplida (carrito vacío, stock insuficiente, talla sin elegir) | `{success:false, message:"Stock insuficiente para Air Force 1 Classic (talla 38)."}` |
| 401 | Sin token, token inválido/expirado, o credenciales incorrectas | `{success:false, message:"Credenciales incorrectas."}` |
| 403 | Autenticado pero sin rol `admin` | `{success:false, message:"Acceso restringido a administradores."}` |
| 404 | Recurso inexistente, o ajeno (los pedidos de otro cliente responden 404, no 403, para no confirmar que existen) | `{success:false, message:"Pedido no encontrado."}` |
| 409 | Conflicto: email ya registrado | `{success:false, message:"Ya existe una cuenta con ese email."}` |
| 422 | Validación de campos | `{success:false, message:"Datos inválidos.", errors:{"email":["El campo email no es válido."]}}` |
| 500 | Excepción no controlada | `{success:false, message:"Error interno del servidor."}` |

## 2.4 Diseño UI/UX

**Mapa de pantallas** (sirve como base para los wireframes)

| Ruta | Pantalla | Acceso | Composición |
|---|---|---|---|
| `/` | Inicio | Público | Hero + categorías + destacados + novedades + ofertas |
| `/catalogo` | Catálogo | Público | Sidebar de filtros + buscador + orden + cuadrícula + paginación |
| `/ofertas` | Ofertas | Público | Cuadrícula filtrada por descuento |
| `/producto/:id` | Detalle | Público | Galería + selector de talla + cantidad + relacionados |
| `/carrito` | Carrito | Público | Líneas editables + resumen fijo + confirmación |
| `/favoritos` | Favoritos | Público* | Cuadrícula o invitación a iniciar sesión |
| `/login`, `/registro` | Acceso | Público | Formularios centrados |
| `/perfil` | Perfil | Cliente | Datos editables |
| `/pedidos` | Mis pedidos | Cliente | Tarjetas con estado por color |
| `*` | 404 | Público | Página de no encontrado con salidas |
| `/admin` + 7 | Panel | Admin | Barra lateral + tabla + modales |

**Principios de usabilidad aplicados**

1. **Visibilidad del estado del sistema.** Esqueletos animados (8 tarjetas
   fantasma que replican la maquetación real) mientras carga; los botones cambian
   a "Ingresando…", "Procesando…", "Guardado" y se deshabilitan durante la
   petición.
2. **Prevención de errores.** Las tallas sin stock se renderizan
   `disabled`; el contador de cantidad topa en el stock disponible; los borrados
   del panel piden confirmación.
3. **Reconocer antes que recordar.** Los filtros activos quedan resaltados; el
   enlace de navegación de la sección actual se marca; las categorías se
   muestran con su icono propio (polo, pantalón, zapatilla, gorra…), lo que
   permite reconocer la sección sin leer la etiqueta.
4. **Salidas claras.** Todos los estados vacíos llevan una acción de salida
   ("Explorar tienda", "Ir a comprar", "Volver al catálogo").
5. **Consistencia visual.** Un solo sistema: `rounded-xl` en controles,
   `rounded-2xl` en tarjetas, `blue-600` como color primario, y dos familias de
   iconos con un reparto claro: `lucide-react` para la interfaz (navegación,
   carrito, acciones, ~30 iconos) y `@phosphor-icons/react` en peso `regular`
   para las categorías del catálogo, que es la única librería libre con
   vocabulario real de moda (`Pants`, `Sneaker`, `BaseballCap`, `Hoodie`).
6. **Retroalimentación de errores.** Los fallos se muestran en un aviso con
   icono, no en un `alert()` del navegador.

**Responsividad**

| Punto de corte | Ancho | Qué cambia |
|---|---|---|
| base | < 640 px | 1 columna; menú lateral desplegable; iconos secundarios solo dentro del menú |
| `sm` | ≥ 640 px | 2 columnas de producto; controles en fila; pie de página a 2 columnas |
| `lg` | ≥ 1024 px | Sidebar de filtros fijo a la izquierda; detalle de producto a 2 columnas; resumen del carrito adherido; barra lateral del panel visible |
| `xl` | ≥ 1280 px | 4 columnas de producto; sidebar más ancho |

Contenedor común `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, ajustado por vista
(`max-w-6xl` en detalle, `max-w-md` en formularios de acceso). La tipografía del
hero es fluida con `clamp(3.5rem, 9vw, 7.5rem)`, sin depender de breakpoints.

---

# 3. Desarrollo e Implementación Técnica

## 3.1 Frontend

**Estructura del proyecto**

```
ecommerce/
├── index.html                  Punto de entrada; carga Poppins
├── vite.config.js  tailwind.config.js  postcss.config.js  eslint.config.js
└── src/
    ├── main.jsx                Monta <App/> dentro de <StrictMode>
    ├── App.jsx                 Único archivo de rutas + StoreLayout
    ├── index.css               Reset, tipografía global, scrollbar
    ├── config/
    │   ├── api.js              Instancia de axios + 2 interceptores
    │   └── negocio.js          Reglas de negocio del cliente (envío)
    ├── context/                Estado global
    │   ├── AuthContext.jsx     Usuario, token, sesión
    │   ├── CartContext.jsx     Carrito (useReducer + persistencia)
    │   └── FavoritesContext.jsx Favoritos sincronizados con la API
    ├── service/                Una función por endpoint (7 archivos)
    ├── components/             Navbar, Footer, Sidebar, Banner,
    │   │                       ProductCard, ProductGrid, RequireAuth
    │   └── admin/AdminLayout.jsx
    └── views/                  11 vistas de tienda + 8 de panel
```

**Manejo de estado.** Tres niveles, elegidos según la naturaleza del dato:

| Contexto | Mecanismo | Persistencia | Por qué |
|---|---|---|---|
| `AuthContext` | `useState` + efecto de arranque | `localStorage` (`token`) | Al recargar, revalida el token contra `GET /users/profile`; si falla, cierra sesión |
| `CartContext` | `useReducer` (4 acciones) | `localStorage` (`carrito`) | El carrito debe sobrevivir a una recarga; se vacía al cerrar sesión |
| `FavoritesContext` | `useState` + actualización optimista | Servidor | Se pinta el corazón antes de la respuesta y se revierte si la petición falla |

La identidad de una línea del carrito es `` `${productId}-${variantId}` ``, lo que
permite el mismo producto en dos tallas como líneas separadas.

**Consumo de APIs.** Una única instancia de axios; no se usa `fetch` en ningún
punto. Interceptor de petición: añade `Authorization: Bearer` leyendo el token en
cada llamada. Interceptor de respuesta: un 401 fuera de `/auth/*` se interpreta
como sesión expirada y expulsa a `/login`; un 401 en `/auth/*` se deja pasar para
que la pantalla muestre "Credenciales incorrectas".

**Formularios y validaciones**

| Formulario | Validación en cliente | Validación en servidor |
|---|---|---|
| Registro | `required` en nombre, email y contraseña; `type=email`; `minLength=6` | `full_name: required\|min:3`, `email: required\|email`, `password: required\|min:6`; 409 si el email existe |
| Inicio de sesión | `required` + formato de email | Mensaje único "Credenciales incorrectas" (no distingue si el usuario existe); luego comprueba `status = 'activo'` |
| Perfil | Campos abiertos; el email se muestra bloqueado | Lista blanca de dos campos (`full_name`, `phone`): imposible escalar privilegios por asignación masiva |
| Alta de producto (panel) | `required` en nombre, categoría, marca y precio | `name: required\|min:3`; `category_id`, `brand_id`, `price`: `required\|numeric` |
| Confirmación de pedido | Talla obligatoria; cantidad topada al stock | Recálculo íntegro en servidor: precio, cantidad, pertenencia de la variante, stock, promoción y envío |

Los errores 422 llegan como `{campo: [mensajes]}` y se muestran en un aviso.

**Librerías**

| Librería | Versión | Uso |
|---|---|---|
| react / react-dom | 18.2 | Base de componentes |
| react-router-dom | 6.22 | 20 rutas, anidadas en `/admin`, guardas |
| axios | 1.6 | Cliente HTTP con interceptores |
| tailwindcss | 3.4 | Sistema de estilos |
| framer-motion | 11.0 | Transiciones, modales, reordenado del carrito |
| lucide-react | 0.383 | Iconografía de la interfaz (~30 iconos) |
| @phosphor-icons/react | 2.1 | Iconos de categoría del catálogo (peso `regular`) |
| vite | 5.0 | Servidor de desarrollo y empaquetado |
| eslint (+3 plugins) | 8.56 | Análisis estático |

## 3.2 Base de Datos

> El esquema pide "Migraciones con Prisma". **Este proyecto no usa Prisma.**
> Preséntalo como *"gestión del esquema mediante scripts SQL versionados"* y sé
> claro en la limitación.

**Migraciones**

| Archivo | Contenido |
|---|---|
| `database/migrations/001_init_schema.sql` | 262 líneas. Crea las 17 tablas, 25 claves foráneas, 14 índices, la función `set_updated_at()` y sus 3 triggers, dentro de un único `BEGIN … COMMIT` |
| `database/seeders/002_seed_data.sql` | 9 categorías, 6 marcas, 36 productos, 36 imágenes, 145 variantes (755 unidades), 1 promoción y 1 administrador. Reajusta la secuencia de `products` con `setval` |

Se aplican con `psql -f`. Ambos son atómicos (todo o nada) pero **no
idempotentes**: ejecutarlos dos veces aborta por violación de unicidad. No existe
tabla de control de versiones del esquema.

**Relaciones entre tablas.** Ver el modelo E-R de la sección 2.2: 17 relaciones
1:N, 1 relación 1:1 (`carts`↔`users` forzada por `UNIQUE`) y 4 tablas puente N:M.

**Integridad referencial** — el esquema apoya la corrección en el motor, no en la
aplicación:

| Mecanismo | Instancias | Ejemplo y para qué sirve |
|---|---|---|
| Claves foráneas con política explícita | 25 | `orders.user_id` es `RESTRICT`: un cliente con pedidos **no se puede borrar**, así el histórico de ventas no puede quedar huérfano |
| Borrado en cascada | 11 | Borrar un producto borra sus imágenes, variantes, favoritos y reseñas en una sola operación atómica |
| `SET NULL` | 4 | Borrar una dirección no destruye el pedido histórico |
| Restricciones `CHECK` | 5 | `stock >= 0` es la última barrera contra la sobreventa; `discount_percent BETWEEN 0 AND 100`; `rating BETWEEN 1 AND 5`; `quantity > 0` |
| Restricciones `UNIQUE` | 12 | `UNIQUE(product_id, size, color)` impide duplicar una variante; `UNIQUE(user_id, product_id)` en favoritos hace la operación idempotente |
| Columna generada | 1 | `final_price` no puede desviarse de `price` y `discount_percent` |
| Triggers | 3 | `updated_at` se mantiene solo en `users`, `products` y `orders` |
| Transacciones | 3 | Creación de pedido, cambio de estado y registro de inventario |

---

# 4. Validación, Pruebas y Resultados

## 4.1 Evaluación del impacto en el negocio

**¿Cómo mejora el proceso?**

| Proceso | Antes (manual) | Con el sistema | Evidencia |
|---|---|---|---|
| Consultar disponibilidad por talla | Ir al almacén | Consulta inmediata en la ficha del producto | Variantes en el detalle |
| Registrar una venta | Anotación en papel | Pedido + líneas + historial + descuento de stock, atómico | Transacción en `OrderRepository::create` |
| Saber qué reponer | Recuento visual | Listado ordenado por stock ascendente | `GET /api/admin/inventory/low-stock` |
| Aplicar un descuento | Reetiquetar a mano | Un campo; el precio final lo recalcula el motor | Columna generada |
| Informar al cliente del estado | Llamada telefónica | Estado visible en "Mis pedidos" | 6 estados con color |

**Indicadores antes y después** `[SIMULADO]`

⚠️ El seed no carga ningún pedido, cliente, reseña ni movimiento de inventario:
**no hay línea base real**. Preséntalos como proyección declarada:

| Indicador | Antes `[SIMULADO]` | Después `[SIMULADO]` | Base del razonamiento |
|---|---|---|---|
| Tiempo de consulta de stock | 5–10 min | < 5 s | Una consulta indexada frente a un recuento físico |
| Errores de precio por descuento mal aplicado | Ocasionales | 0 | Estructuralmente imposible: el precio final es una columna generada |
| Cobertura horaria de venta | Horario de tienda | 24/7 | La tienda es web |
| Tiempo de alta de un producto con 6 tallas | ~15 min | ~3 min | Formulario + variantes en el panel |
| Trazabilidad de movimientos de stock | 0 % | 100 % de los registrados por el panel | `inventory_movements` con motivo y autor |

**Beneficios cuantificables** — lo honesto es separar los dos grupos:

*Verificables en el código:* eliminación estructural del descuadre de precios;
atomicidad de la venta; auditoría de inventario con autor y motivo; catálogo
gestionable sin tocar código; alerta de reposición automática.

*No verificables sin operación real:* aumento de ventas, reducción de costos y
tasa de conversión. No los presentes como resultados medidos.

## 4.2 Limitaciones y mejoras futuras

### Limitaciones actuales

| Área | Limitación | Consecuencia |
|---|---|---|
| Pago | No hay pasarela | El pedido nace en `pendiente` sin cobrar |
| Envío | No hay formulario de dirección | Todo pedido queda con `address_id` NULL; el envío es una tarifa fija |
| Cupones | El backend los aplica pero la tienda no tiene campo para introducirlos | Funcionalidad construida e inalcanzable |
| Reseñas | Tabla modelada, sin endpoints ni pantalla | `rating_avg` y `rating_count` no se alimentan de datos reales |
| Estados de pedido | Sin máquina de estados: se acepta cualquier transición | "entregado" puede volver a "pendiente"; cancelar **no** repone stock |
| Promociones | `applies_to`, `category_id` y `product_id` se guardan pero el checkout no los lee | Un cupón "por producto" descuenta todo el carrito |
| Migraciones | Scripts manuales, no idempotentes, sin control de versión | No se sabe qué versión tiene una base ya desplegada |
| Pruebas | 0 pruebas automatizadas; `npm run lint` no tiene reglas configuradas | Sin red de seguridad ante cambios |
| Panel en móvil | La barra lateral es `hidden lg:flex` sin alternativa | Por debajo de 1024 px no hay navegación interna |
| Imágenes | Solo por URL externa; sin subida de archivos | Dependencia total de un CDN de terceros |

### Escalabilidad

*Puntos que aguantan.* API sin estado (JWT): se puede replicar horizontalmente
detrás de un balanceador sin sesiones compartidas. Paginación en servidor con
`LIMIT/OFFSET` y `limit` acotado a 100. Índices en las columnas de filtro
(`category_id`, `brand_id`, `status`). Precio calculado por el motor: no hay
recálculos masivos.

*Puntos que se rompen primero, por orden:*

1. **El resumen del panel descarga tablas completas** para contar filas
   (`orders`, `users`) porque no existe un endpoint de métricas. Con 10 000
   pedidos, la pantalla de inicio del panel descarga los 10 000.
   → *Solución: `GET /api/admin/stats` con `COUNT(*)` por indicador.*
2. **La búsqueda usa `ILIKE '%texto%'`,** que no puede aprovechar ningún índice:
   siempre es recorrido secuencial. El índice `idx_products_name_trgm` que existe
   es de `tsvector`, no de trigramas, y la extensión `pg_trgm` nunca se crea.
   → *Solución: `pg_trgm` + índice GIN, o búsqueda de texto completo con `@@`.*
3. **`OFFSET` alto degrada** en catálogos grandes.
   → *Solución: paginación por cursor (`WHERE id < :ultimo`).*
4. **Checkout con N+1 consultas:** una por producto y otra por variante.
   → *Solución: una sola consulta con `WHERE id = ANY(:ids)`.*
5. **Falta de índices en claves foráneas consultadas** (`order_items.product_id`,
   `favorites.product_id`, `order_status_history.order_id`).
   → *Solución: añadirlos; PostgreSQL no los crea solo.*
6. **Un único bundle de 462 kB** sin división de código: el panel completo se
   descarga en la primera visita de un usuario anónimo.
   → *Solución: `React.lazy` + `Suspense` en el bloque `/admin`.*
7. **Sin caché en ningún nivel** (ni `Cache-Control`, ni ETag, ni Redis) pese a
   que el catálogo es altamente cacheable.

### Seguridad avanzada

*Lo que ya está bien resuelto y conviene destacar:*

- **Inyección SQL:** no se encontró ningún vector. Todo valor de usuario viaja por
  marcador nombrado; `EMULATE_PREPARES=false` fuerza consultas preparadas reales;
  el único parámetro que decide estructura SQL (`sort`) pasa por una lista blanca
  de cinco ramas fijas; los `UPDATE` dinámicos construyen el `SET` desde arrays
  de columnas escritos en el código, nunca desde las claves del cuerpo.
- **Contraseñas:** bcrypt vía `password_hash`; el hash nunca se devuelve.
- **JWT:** la firma se recalcula siempre como HS256 sin leer el campo `alg` del
  encabezado, así que la confusión de algoritmos (`alg: none`) es imposible; la
  comparación usa `hash_equals` (tiempo constante).
- **Manipulación de precios:** imposible. El cliente no envía importes.
- **Escalada por asignación masiva:** imposible en el perfil (lista blanca de dos
  campos) y en el registro (rol forzado a `cliente`).
- **IDOR en pedidos:** `GET /api/orders/{id}` comprueba la propiedad y responde
  404 en lugar de 403, para no confirmar la existencia del recurso.

*Lo que falta, por prioridad:*

| Prioridad | Riesgo | Mitigación |
|---|---|---|
| 🔴 Alta | El rol viaja dentro del JWT y no se revalida contra la base de datos, con 7 días de vigencia y sin revocación: degradar o bloquear a un administrador **no le quita el acceso** hasta que caduque el token | Token de acceso corto (15 min) + token de refresco; o releer rol y estado en cada petición |
| 🔴 Alta | El token vive en `localStorage`: accesible a cualquier script (XSS) | Cookie `HttpOnly` + `Secure` + `SameSite`, con protección CSRF |
| 🔴 Alta | Ninguna protección de gobierno del panel: un administrador puede degradarse, bloquearse o borrarse a sí mismo, incluso siendo el último | Impedir la auto-modificación y exigir que quede al menos un administrador |
| 🟠 Media | `/auth/login` sin límite de intentos | Limitación por IP y por cuenta, con retardo progresivo |
| 🟠 Media | Los errores 500 devuelven el mensaje interno de la excepción (nombres de tabla, columna y restricción) | Condicionar el detalle a `APP_DEBUG` y registrar en fichero |
| 🟠 Media | CORS admite un único origen sin lista blanca y emite `Allow-Credentials: true` | Lista blanca comparada contra `Origin` + `Vary: Origin` |
| 🟠 Media | El email no se normaliza: `Ana@x.com` y `ana@x.com` crean dos cuentas | `trim` + `strtolower`, o índice único sobre `lower(email)` |
| 🟡 Baja | 8 campos de estado son `VARCHAR` sin `CHECK`: sus valores válidos solo existen en comentarios SQL | Añadir `CHECK` o tipos `ENUM` |
| 🟡 Baja | Sin `.gitignore`: el `.env` con credenciales puede terminar versionado | Añadir `.gitignore` |
| 🟡 Baja | El `.htaccess` no reexporta `Authorization`: en Apache con PHP-FPM **todas** las rutas protegidas darían 401 | `RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]` |

## 4.3 Presentación ejecutiva (pitch)

**El problema.** Una tienda de moda urbana vende un producto cuyo inventario no
es el producto, sino la talla. Sin sistema, la pregunta más frecuente del
cliente — "¿tienen mi talla?" — solo se puede responder yendo al almacén. Y cada
venta se anota a mano, así que nadie sabe qué se vendió, qué queda ni qué
reponer.

**La solución.** UrbanStyle: una tienda en línea con catálogo dinámico,
inventario a nivel de talla y panel de administración, sobre una API REST propia
y una base de datos relacional normalizada de 17 tablas.

**El valor agregado** — tres cosas que no son promesas, son propiedades del
diseño:

1. **El precio con descuento no puede estar mal.** Lo calcula el motor de base de
   datos como columna generada; ninguna capa de la aplicación puede escribirlo.
2. **Una venta es atómica o no es.** Pedido, líneas, historial y descuento de
   stock ocurren en una sola transacción SQL: no existen ventas a medias.
3. **El cliente no puede alterar lo que paga.** El navegador solo envía qué y
   cuánto; el precio, el descuento y el envío los recalcula el servidor.

**Viabilidad.** Construido y funcionando: 52 endpoints, 19 pantallas, catálogo de
36 productos con 145 variantes. Sobre tecnologías gratuitas y ampliamente
soportadas (PHP, PostgreSQL, React), desplegables en cualquier hosting
convencional, sin licencias.

**Escalabilidad.** La API no guarda estado, así que se replica horizontalmente
sin cambios. El modelo de datos ya soporta subcategorías, reseñas, carrito
persistente y promociones segmentadas: activarlas es trabajo de aplicación, no
de rediseño del esquema. La siguiente etapa natural es la integración de una
pasarela de pago y la gestión de direcciones de envío, que son las dos piezas
que hoy separan el proyecto de una operación comercial real.

---

# Anexo A — Qué cubre el código y qué hay que declarar como simulado

| Punto del esquema | Estado | Nota |
|---|---|---|
| 1.1 Contexto del negocio | ⚠️ Parcial | Empresa simulada; el sector y los datos del catálogo son reales en el sistema |
| 1.2 Análisis del problema | ⚠️ Parcial | FODA y stakeholders derivados del código; el **impacto actual** es simulado |
| 1.3 Propuesta de valor | ✅ Cubierto | Los 3 diferenciadores son verificables |
| 1.4 Modelado del negocio | ⚠️ Parcial | Canvas y procesos derivados del código; los KPIs son medibles pero **sin datos históricos** |
| 2.1 Arquitectura general | ✅ Cubierto | ⚠️ La justificación tecnológica **no coincide** con Node+Express+Prisma |
| 2.2 Diseño de base de datos | ✅ Cubierto | Modelo E-R y diccionario completos |
| 2.3 Diseño de API | ✅ Cubierto | 52 endpoints con petición, respuesta y errores reales |
| 2.4 Diseño UI/UX | ⚠️ Parcial | Mapa de pantallas, usabilidad y responsividad documentados; **los wireframes hay que dibujarlos** |
| 3.1 Frontend | ✅ Cubierto | Estructura, estado, consumo de API, formularios y librerías |
| 3.2 Base de datos | ⚠️ Parcial | Relaciones e integridad completas; **no hay Prisma**, son scripts SQL |
| 4.1 Impacto en el negocio | ⚠️ Simulado | La mejora de proceso es real; las cifras antes/después no |
| 4.2 Limitaciones y mejoras | ✅ Cubierto | Escalabilidad y seguridad con hallazgos concretos |
| 4.3 Pitch ejecutivo | ✅ Cubierto | Redactado arriba |

**Lo que todavía tienes que producir a mano:** los **wireframes o mockups** del
punto 2.4 (puedes capturar las pantallas ya construidas y anotarlas), el
**Business Model Canvas** en formato de lienzo visual, y el **diagrama E-R** en
una herramienta de diagramas si el docente lo quiere en notación formal
(el modelo textual de la sección 2.2 tiene todo lo necesario).
