# UrbanStyle API (Backend PHP + PostgreSQL)

API REST en **PHP puro** (sin frameworks: sin Laravel, Symfony, etc.), organizada en capas
`Controller → Service → Repository → PDO/PostgreSQL`, con autenticación JWT propia.

## 📁 Estructura

```
backend/
├── public/
│   ├── index.php        Front controller único (rutas, DI, despacho)
│   └── .htaccess        Reescritura de URLs (Apache)
├── src/
│   ├── Config/          Database.php (PDO), Env.php (.env loader)
│   ├── Router/          Router.php (enrutador con regex)
│   ├── Controllers/      Controladores públicos + carpeta Admin/ (CRUD panel)
│   ├── Services/        Reglas de negocio
│   ├── Repositories/    Consultas SQL (PDO preparado)
│   ├── Middleware/      CORS, JwtAuthMiddleware, AdminMiddleware
│   └── Utils/           Response, Request, JwtHandler, Validator
├── .env.example
└── composer.json
```

## ⚙️ Requisitos

- PHP >= 8.1 con extensión `pdo_pgsql`
- PostgreSQL >= 13
- Servidor web (Apache con `mod_rewrite`, Nginx, o el servidor embebido de PHP para desarrollo)

## 🚀 Instalación

1. Crea la base de datos y ejecuta las migraciones y el seed:

```bash
# IMPORTANTE: forzar UTF-8 antes de cargar los .sql
export PGCLIENTENCODING=UTF8      # en PowerShell:  $env:PGCLIENTENCODING = "UTF8"

createdb urbanstyle
psql -d urbanstyle -f ../database/migrations/001_init_schema.sql
psql -d urbanstyle -f ../database/seeders/002_seed_data.sql
```

> ⚠️ **`PGCLIENTENCODING=UTF8` no es opcional en Windows.** Los `.sql` están en
> UTF-8, pero `psql` toma `client_encoding` de la consola, que en un Windows en
> español es WIN-1252. Sin esta variable, psql lee los bytes UTF-8 como Latin-1 y
> los **vuelve a codificar**: los datos quedan doblemente codificados y la tienda
> muestra `PantalÃ³n Chino Slim` y `ðŸ‘Ÿ` en lugar de `Pantalón Chino Slim` y `👟`.
> No da ningún error: la carga "funciona" y el destrozo solo se ve en pantalla.
>
> En Windows usa mejor `setup-db.ps1` (en la raíz del proyecto), que ya lo hace y
> además comprueba la codificación al terminar.

2. Copia el archivo de entorno y ajusta credenciales:

```bash
cp .env.example .env
```

3. Levanta el servidor de desarrollo de PHP (o configura tu Apache/Nginx apuntando a `public/`):

```bash
cd public
php -S localhost:8000
```

La API quedará disponible en `http://localhost:8000/api/...`, que coincide con
`VITE_API_URL=http://localhost:8000/api` de `ecommerce/.env.example`.

> **El puerto es 8000.** Es el que traen `ecommerce/.env.example`, el fallback de
> `ecommerce/src/config/api.js` y el README raíz. (Antes este README decía 3000 y
> afirmaba que el frontend ya venía configurado así: era falso, y dejaba la tienda
> sin datos y sin ningún mensaje de error.)

> ⚠️ Requiere la extensión `pdo_pgsql` habilitada en `php.ini`. En XAMPP viene
> comentada por defecto (`;extension=pdo_pgsql`): si falta, **todas** las rutas
> responden 500 porque el front controller abre la conexión PDO antes de enrutar.

> El usuario administrador del seed es `admin@urbanstyle.pe` con contraseña
> `Admin123!`. Para cambiarla, genera el hash con
> `php -r "echo password_hash('TuPasswordSegura', PASSWORD_BCRYPT);"`
> y aplícalo con `UPDATE users SET password_hash = '...' WHERE email = 'admin@urbanstyle.pe';`

## 🔑 Autenticación

JWT propio (HS256, implementado en `Utils/JwtHandler.php`, sin librerías externas).
Se envía como `Authorization: Bearer <token>` en cada petición protegida.

## 📚 Endpoints principales

### Catálogo (público)
| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/products | Lista con filtros: category, brand, size, minPrice, maxPrice, sort, search, page, limit |
| GET | /api/products/{id} | Detalle completo (imágenes + variantes) |
| GET | /api/products/{id}/related | Productos relacionados |
| GET | /api/products/featured | Productos destacados |
| GET | /api/products/new | Productos nuevos (últimos 30 días) |
| GET | /api/products/offers | Productos en oferta |
| GET | /api/categories | Categorías y subcategorías |
| GET | /api/brands | Marcas |

### Auth y usuario
| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/auth/register | Registro de cliente |
| POST | /api/auth/login | Login, devuelve JWT |
| GET | /api/users/profile | Perfil (requiere token) |
| PUT | /api/users/profile | Actualizar perfil (requiere token) |

### Pedidos y favoritos (requieren token)
| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/orders | Crear pedido desde el carrito |
| GET | /api/orders | Historial del usuario autenticado |
| GET | /api/orders/{id} | Detalle de un pedido propio |
| GET | /api/favorites | Listar favoritos |
| POST | /api/favorites | Agregar favorito `{ product_id }` |
| DELETE | /api/favorites/{productId} | Quitar favorito |

### Panel administrativo (requieren token + rol admin)
CRUD completo para: `/api/admin/products`, `/api/admin/categories`, `/api/admin/brands`,
`/api/admin/users`, `/api/admin/orders` (+ `/status`), `/api/admin/inventory`
(+ `/low-stock`), `/api/admin/promotions`.

## 🧩 Diseño

- **Sin ORM ni frameworks**: PDO con consultas preparadas (protección contra SQL injection).
- **Autoload PSR-4 manual** (`spl_autoload_register` en `index.php`), no requiere `composer install`
  para funcionar, aunque `composer.json` documenta la convención de namespaces.
- **precio final** se calcula en la base de datos como columna generada
  (`final_price = price - price * discount_percent/100`), evitando inconsistencias.
