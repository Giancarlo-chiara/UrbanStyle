# Errores encontrados y corregidos

Revisión completa del código (backend PHP, base de datos, frontend React y panel
administrativo). Lo que sigue son **defectos reales verificados en el código**, no
sugerencias de estilo. Cada uno indica el archivo tocado.

---

## A. Bloqueaban el arranque del proyecto

### A1 · Falta la extensión `pdo_pgsql` en PHP — *entorno*
Tu PHP (XAMPP 8.2.12) tenía `pgsql` pero **no** `pdo_pgsql`, que es la que el
proyecto declara en `composer.json` y la que usa `Database.php`. Como el front
controller abre la conexión PDO **antes** de enrutar, *todas* las rutas
respondían 500, incluida `/api/health`.

**Corregido:** descomentada la línea `extension=pdo_pgsql` en
`C:\xampp\php\php.ini` (copia de seguridad en `php.ini.bak-assiskey`).

### A2 · El administrador del seed no podía iniciar sesión — `database/seeders/002_seed_data.sql`
El seed insertaba `password_hash = '$2y$10$mockHashReplaceOnFirstDeploy1234567890abcdefghijklmno'`.
Tiene los 60 caracteres de un hash bcrypt válido, así que PHP lo procesa sin
quejarse, pero no deriva de ninguna contraseña: `password_verify` devolvía `false`
siempre. Y el comentario de la línea de arriba **afirmaba lo contrario** ("El hash
corresponde a 'Admin123!'"). Como el registro fuerza rol `cliente` y no hay
endpoint para crear administradores, el panel era **inaccesible** en una
instalación limpia.

**Corregido:** hash bcrypt real generado y verificado con `password_verify`.
Credenciales: `admin@urbanstyle.pe` / `Admin123!`.

### A3 · El puerto de la API se contradecía en tres archivos
| Archivo | Decía |
|---|---|
| `ecommerce/.env.example` | `http://localhost:8000/api` |
| `ecommerce/src/config/api.js` (fallback) | `http://localhost:3000/api` |
| `backend/README.md` | `php -S localhost:3000`, y afirmaba que el frontend "ya está configurado" para 3000 |

Siguiendo el README, el frontend apuntaba a un puerto sin backend y **todas** las
vistas quedaban vacías sin ningún mensaje de error.

**Corregido:** unificado en **8000** (`api.js` y `backend/README.md`), y añadido el
aviso de `pdo_pgsql` al README.

---

## B. Funcionalidad anunciada que no funcionaba

### B4 · La página `/ofertas` no filtraba ofertas — `ecommerce/src/service/productService.js`
`Offers.jsx` llamaba `getProducts({ onSale: 1, ... })`, pero `getProducts` solo
traducía a query string 9 claves y **descartaba `onSale` en silencio**. El backend
sí soporta el filtro. Resultado: `/ofertas` mostraba el **catálogo completo**
ordenado por precio, bajo el título "Ofertas del momento" y el subtítulo
"Descuentos reales cargados directamente desde la base de datos".

**Corregido:** `getProducts` ahora reenvía `onSale`, `featured` e `isNew`.

### B5 · La búsqueda del navbar no hacía nada dentro del catálogo — `ecommerce/src/views/Catalog.jsx`
El buscador del navbar hace `navigate('/catalogo?search=...')`, pero `Catalog.jsx`
leía los parámetros de la URL **solo en el inicializador de `useState`**. Si ya
estabas en `/catalogo`, la URL cambiaba y ni el estado ni la cuadrícula
reaccionaban: la búsqueda se perdía sin aviso. Igual con `?category=`.

**Corregido:** efecto que sincroniza URL → estado (con guarda para no entrar en
bucle con el efecto que escribe la URL).

### B6 · Editar un producto en el panel perdía su categoría y su marca — `backend/src/Repositories/ProductRepository.php`
`Products.jsx` hacía `category_id: p.category_id` al abrir el formulario, pero el
`SELECT` del listado devolvía `c.name AS category` y `b.name AS brand` y **nunca**
`p.category_id` ni `p.brand_id`. Ambos llegaban como `undefined`, los `<select>`
pasaban de controlados a no controlados y mostraban "Selecciona…". Como son
`required`, había que re-elegir categoría y marca en **cada** edición.

**Corregido:** `findAll` ahora devuelve `category_id`, `subcategory_id` y `brand_id`.

### B7 · Lo que el admin desactivaba desaparecía del panel para siempre
Los tres listados del panel reutilizaban los repositorios de la tienda, que
filtran por estado: `ProductRepository::findAll`/`countAll` con
`WHERE p.status != 'inactivo'`, y `CategoryRepository`/`BrandRepository` con
`WHERE status = 'activo'`. Pero el panel **ofrece** la opción "inactivo" en sus
selectores. Así que el admin desactivaba un producto, la fila se iba del listado y
ya no había forma de reactivarlo salvo por SQL directo. El comentario del código
decía justo lo contrario: *"El admin puede ver también productos inactivos"*.

**Corregido:** los tres repositorios aceptan un parámetro para incluir inactivos y
los controladores admin lo activan. El parámetro **no se lee de `$_GET`** a
propósito, para que la tienda pública no pueda pedirlo.
Archivos: `ProductRepository.php`, `CategoryRepository.php`, `BrandRepository.php`,
`ProductService.php`, `CategoryService.php`, `BrandService.php`,
`AdminProductController.php`, `AdminCategoryController.php`, `AdminBrandController.php`.

### B8 · El filtro de tallas no alcanzaba a la mayoría del catálogo — `ecommerce/src/components/Sidebar.jsx`
El sidebar tenía `const sizes = ['XS','S','M','L','XL','XXL']` **hardcodeado**,
mientras categorías y marcas sí venían de la API. Pero el catálogo usa 23 tallas
distintas: calzado (36–44), cintura (26–38), letras y `Única`. Filtrar por talla
era imposible para zapatillas, pantalones, gorras, mochilas, relojes y lentes.

**Corregido:** nuevo endpoint `GET /api/products/sizes` (`SELECT DISTINCT`), y el
sidebar las pinta ordenadas (numéricas primero, luego XS→XXL, luego el resto).
Archivos: `ProductRepository.php`, `ProductService.php`, `ProductController.php`,
`index.php`, `productService.js`, `Catalog.jsx`, `Sidebar.jsx`.

### B9 · El error de login se comía a sí mismo — `ecommerce/src/config/api.js`
El interceptor de respuesta hacía `window.location.href = '/login'` ante
**cualquier** 401. Pero `POST /auth/login` con credenciales malas devuelve
justamente 401. Así que al fallar el login se programaba una recarga dura de
`/login` **antes** de que la vista pudiera pintar "Credenciales incorrectas": el
usuario veía la página reiniciarse sin explicación.

**Corregido:** el interceptor distingue "sesión expirada" de "credenciales
inválidas": no expulsa en un 401 de `/auth/*`, ni cuando ya estás en `/login`.

### B10 · No existía página 404 — `ecommerce/src/App.jsx`
No había ninguna ruta comodín. Cualquier URL mal escrita o enlace roto renderizaba
el árbol vacío: **página totalmente en blanco**, sin navbar ni pie, indistinguible
de un fallo de JavaScript.

**Corregido:** nueva vista `NotFound.jsx` y ruta `path="*"` dentro del layout de
tienda.

### B11 · El techo de precio ocultaba productos sin decirlo — `Catalog.jsx` + `Sidebar.jsx`
`defaultFilters.maxPrice = 600` se enviaba **siempre** como filtro, y el
deslizador tenía `max="600"` fijo, así que el usuario no podía subirlo. Cualquier
producto por encima de S/ 600 era invisible en el catálogo y ni el contador de
productos lo contaba. El botón "Limpiar" volvía a 600, no lo eliminaba.

**Corregido:** por defecto no se envía filtro de precio ("Sin límite"); el
deslizador llega a S/ 2000 y en el tope limpia el filtro en lugar de aplicarlo.

---

## C. Integridad de datos y dinero

### C12 · Se podía cobrar un producto y descontar el stock de otro — `backend/src/Services/OrderService.php`
`findVariantById` es `SELECT * FROM product_variants WHERE id = :id`, **sin filtro
por producto**, y el checkout nunca comparaba `$variant['product_id']` con
`$product['id']`. Enviando `{product_id: <barato>, variant_id: <variante de uno caro>}`
se cobraba el precio del barato y se descontaba el inventario del caro, dejando
además `order_items` con datos incoherentes entre sí.

**Corregido:** se valida que la variante pertenezca al producto de la línea.

### C13 · Sobreventa silenciosa — `backend/src/Repositories/OrderRepository.php`
El `UPDATE` de stock lleva la guarda `AND stock >= :qty`, que evita el stock
negativo, pero **nadie miraba `rowCount()`**. Si otra compra vaciaba la variante
entre la validación y el `UPDATE`, este afectaba 0 filas, no lanzaba nada, y el
`commit` confirmaba el pedido **sin descontar stock**. Reproducible incluso en una
sola petición: dos líneas con el mismo `variant_id` pasaban las dos validaciones
por separado.

**Corregido:** si el `UPDATE` no afecta ninguna fila, se lanza excepción y la
transacción se revierte. Además el checkout ahora **consolida** las líneas
repetidas antes de comprobar el stock.

### C14 · Sin `variant_id` no había ningún control de inventario — `OrderService.php` + `ProductCard.jsx`
Tanto la validación de stock como el descuento eran condicionales a que llegara
`variant_id`. Omitiéndolo se podía pedir **cualquier cantidad de cualquier
producto, incluso agotado**, y el pedido se creaba sin tocar el inventario. Y el
botón "Agregar" de la tarjeta del catálogo enviaba `variantId: null`, así que
**ningún pedido hecho desde el catálogo descontaba stock**.

**Corregido:** el backend exige talla si el producto tiene variantes, y el botón
de la tarjeta abre la vista rápida para elegirla (ahora se llama "Elegir talla").

### C15 · La cantidad no se validaba nunca — `OrderService.php`
Se usaba `(int)$item['quantity']` sin comprobar que existiera, fuera entero ni
fuera mayor que 0. Una cantidad ausente daba 0; una **negativa** producía un
subtotal negativo que **restaba** del total del pedido. El `CHECK (quantity > 0)`
de la base de datos frenaba la escritura, pero convertía un error de validación
(422) en una `PDOException` no capturada → 500 con el mensaje de PostgreSQL
expuesto al cliente.

**Corregido:** validación con `FILTER_VALIDATE_INT`, mínimo 1 y tope de 20
unidades por línea. También se rechazan los productos que no estén `activo`.

### C16 · `limit` sin acotar — `ProductRepository.php`
`?limit=1000000` volcaba el catálogo entero en una petición; `?limit=-1` generaba
`LIMIT -1`, que PostgreSQL rechaza → 500 con SQL expuesto; `?limit=0` devolvía
lista vacía con una paginación incoherente.

**Corregido:** acotado a `min(100, max(1, limit))`, y la paginación usa el mismo
valor acotado para que el total de páginas cuadre.

### C17 · `GET /api/products/{id}` servía productos ocultos — `ProductController.php`
`findById` no filtra por estado, así que la ruta pública devolvía productos
`inactivo` con todos sus datos, aunque el listado los oculte. Y el checkout los
aceptaba como comprables.

**Corregido:** la ruta pública responde 404 para productos `inactivo`
(`findById` sigue sin filtrar porque el panel necesita verlos).

### C18 · "Ajuste" de inventario sumaba en lugar de fijar — `backend/src/Repositories/InventoryRepository.php`
El cálculo era `$delta = $type === 'salida' ? -$quantity : $quantity`. Sin rama
para `'ajuste'`, un ajuste de 10 **sumaba** 10 igual que una entrada, en lugar de
dejar el stock en 10 — que es lo que promete el nombre del tipo y el selector del
panel.

**Corregido:** `'ajuste'` fija el stock al valor indicado; `entrada` suma y
`salida` resta, como antes.

---

## D. Configuración y consistencia

### D19 · Bug de precedencia de operadores — `backend/src/Config/Env.php`
`return self::$values[$key] ?? getenv($key) ?: $default;`
En PHP `??` tiene **más** precedencia que `?:`, así que se evaluaba como
`(valores[$key] ?? getenv($key)) ?: $default`. Consecuencia: cualquier variable
definida pero con valor "falsy" se sustituía por el valor por defecto. Con
`JWT_SECRET=` vacío en el `.env`, la API firmaba tokens con
`'urbanstyle_dev_secret_change_me'` **sin avisar**; con `CORS_ALLOWED_ORIGIN=`
vacío, devolvía `*`. Y era imposible expresar el valor literal `'0'`.

**Corregido:** comprobación explícita con `array_key_exists` y `getenv() === false`.

### D20 · El coste de envío estaba escrito dos veces y ya divergía
`Cart.jsx` calculaba `total >= 200 ? 0 : 15` sobre el subtotal **bruto**;
`OrderService.php` calculaba lo mismo sobre el subtotal **menos el descuento**.
Con un cupón aplicado, el usuario veía un envío distinto del que se le cobraba.

**Corregido:** constantes con nombre en el backend (`ENVIO_COSTO`,
`ENVIO_GRATIS_DESDE`) y un único módulo en el frontend
(`ecommerce/src/config/negocio.js`), con referencia cruzada en los comentarios de
ambos lados.

### D25 · El error de conexión a la base de datos llegaba como un 500 **vacío** — `Database.php` + `Response.php`
Encontrado al ejecutar el proyecto, no leyéndolo. PostgreSQL devuelve sus mensajes
de error en la codificación del sistema operativo; en un Windows en español eso es
Latin‑1, **no UTF‑8**. `json_encode` devuelve `false` ante bytes mal codificados, y
`echo false` no imprime nada. Resultado medido: `GET /api/health` respondía
`HTTP 500` con las cabeceras correctas y **cuerpo de 0 bytes**, así que el
desarrollador no recibía ninguna pista de la causa — precisamente en el momento en
que el mensaje de error es lo único útil.

Comprobado en tu máquina:
```
mensaje crudo (bytes): 88
es UTF-8 valido?: NO
json_encode devuelve: false
json_last_error_msg: Malformed UTF-8 characters, possibly incorrectly encoded
```

El mismo defecto latente estaba en `Response::json`, que afecta a **todas** las
respuestas de la API: cualquier dato con codificación inválida procedente de
PostgreSQL produciría un cuerpo vacío con `Content-Type: application/json`.

**Corregido:** `JSON_INVALID_UTF8_SUBSTITUTE` en ambos sitios (sustituye los bytes
inválidos en lugar de fallar), `charset=utf-8` en la cabecera de `Database.php`, y
una red de seguridad en `Response::json` que emite un JSON válido si la
serialización falla de todas formas. Tras el arreglo, la misma petición responde:
```json
{"success":false,"message":"Error de conexión a la base de datos.",
 "error":"SQLSTATE[08006] [7] FATAL: la autentificación password falló..."}
```

### D26 · Toda la tienda mostraba los acentos y emojis rotos — `setup-db.ps1` + `backend/README.md`
Encontrado al abrir la tienda en el navegador. Los `.sql` están correctamente en
UTF-8 (verificado byte a byte: `Única` aparece 11 veces como `C3 9A`, y 0 veces
doblemente codificada). Pero **`psql` en Windows toma `client_encoding` de la
consola**, que en un Windows en español es WIN‑1252: lee los bytes UTF‑8 como
Latin‑1 y los **vuelve a codificar** al insertarlos. Los datos quedan doblemente
codificados en la base.

Lo peor es que **no da ningún error**: la carga dice "COMMIT" y todo parece bien.
El destrozo solo se ve en pantalla:

| En pantalla | Debería ser |
|---|---|
| `ðŸ’¼ Accesorios` | `💼 Accesorios` |
| `Stan Smith ClÃ¡sico` | `Stan Smith Clásico` |
| `PantalÃ³n Chino Slim` | `Pantalón Chino Slim` |
| `Ãšnica` | `Única` |

El diagnóstico se confirma comparando qué texto se rompe: **el que está escrito en
el código React se ve perfecto** ("Nueva Colección 2026", "Recién llegados"), y
**solo se rompe el que viene de la base de datos**. Es decir, ni la aplicación ni
la API tienen el problema: está en cómo entraron los datos.

**Corregido:** `setup-db.ps1` fija `PGCLIENTENCODING=UTF8` antes de cargar los
scripts y, al terminar, comprueba que `Única` ocupe 6 bytes (si ocupa 8, está
doblemente codificada y avisa). El `backend/README.md` documenta la variable.

### D21 · El carrito se perdía con cualquier recarga — `ecommerce/src/context/CartContext.jsx`
El carrito vivía **solo en memoria** (`useReducer` sin persistencia). Un F5,
cerrar la pestaña o cualquier 401 (que provoca una recarga dura hacia `/login`)
lo vaciaba. El propio flujo empujaba a ello: sin sesión, "Finalizar compra" te
manda a `/login`, y al volver el carrito estaba vacío.

**Corregido:** persistencia en `localStorage` (tolerante a JSON corrupto y a
almacenamiento bloqueado).

### D22 · `logout()` no vaciaba el carrito — `CartContext.jsx`
Los favoritos sí se limpiaban al cerrar sesión, pero el carrito no escuchaba la
sesión: los productos del usuario A seguían en memoria cuando el usuario B
iniciaba sesión en la misma pestaña, y se enviaban con **su** pedido.

**Corregido:** el carrito se vacía al detectar el cierre de sesión.

### D23 · Una petición HTTP por cada tecla — `Catalog.jsx`
El buscador escribía directamente en los filtros y el efecto disparaba
`GET /products` en cada `onChange`. Escribir "zapatillas" eran 11 peticiones
encadenadas cuyas respuestas podían llegar desordenadas y pisarse entre sí.

**Corregido:** debounce de 350 ms.

### D24 · Un fallo de red se disfrazaba de "Sin resultados" — `Catalog.jsx`
El `catch` solo hacía `setProducts([])`, así que un error de red mostraba el mismo
estado vacío que una búsqueda sin coincidencias.

**Corregido:** aviso de error explícito, separado del estado vacío.

---

## Lo que NO he tocado (y por qué)

Estos son hallazgos reales, documentados en `INFORME-PROYECTO.md` §4.2, que dejé
sin corregir porque **cambian el comportamiento del producto** y esa decisión es
tuya, no mía:

| Hallazgo | Por qué no lo toqué |
|---|---|
| El rol viaja en el JWT y no se revalida contra la BD (7 días, sin revocación): degradar a un admin no le quita el acceso | Requiere rediseñar la autenticación (token corto + refresco). Cambia el flujo de sesión |
| El token vive en `localStorage` (expuesto a XSS) | Migrar a cookie `HttpOnly` obliga a añadir protección CSRF y tocar CORS |
| Un admin puede degradarse, bloquearse o borrarse a sí mismo, incluso siendo el último | Es una regla de negocio: hay que decidir cuál |
| Cancelar un pedido no repone el stock; no hay máquina de estados | Decisión de negocio: qué transiciones son legales y si cancelar devuelve inventario |
| Las promociones ignoran `applies_to`, `category_id` y `product_id`: un cupón "por producto" descuenta todo el carrito | Cambia el comportamiento comercial de los cupones ya creados |
| No hay campo para introducir cupones en la tienda, ni formulario de dirección de envío, ni pasarela de pago | Es funcionalidad nueva, no una corrección |
| Los 500 devuelven el mensaje interno de PostgreSQL | Necesita una variable `APP_ENV`/`APP_DEBUG` que hoy no existe |
| Sin límite de intentos en `/auth/login` | Requiere almacenamiento de intentos |
| 8 campos de estado son `VARCHAR` sin `CHECK` | Es una migración de esquema sobre datos existentes |
| El `.htaccess` no reexporta `Authorization` (rompería en Apache con PHP-FPM) | No afecta al servidor de desarrollo; conviene arreglarlo antes de desplegar |
| El resumen del panel descarga tablas completas para contar filas | Necesita un endpoint `/api/admin/stats` nuevo |
| Sin `.gitignore` (riesgo de versionar el `.env`) | Decisión de repositorio |
| El panel no tiene navegación por debajo de 1024 px | Es trabajo de diseño responsive |
| Sin pruebas automatizadas; `eslint.config.js` no define ninguna regla | Es infraestructura de calidad, no un bug |

---

## Verificación

| Comprobación | Resultado |
|---|---|
| Sintaxis PHP (47 archivos, `php -l`) | ✅ 0 errores |
| Build de producción (`npm run build`) | ✅ 1950 módulos, 462 kB (135 kB gzip) |
| ESLint (`npx eslint .`) | ✅ sin problemas |
| Enrutado del servidor embebido de PHP | ✅ `/api/health` llega a `index.php` (no 404) |
| Hash del admin (`password_verify`) | ✅ `Admin123!` correcto |
| Extensión `pdo_pgsql` (`php -m`) | ✅ cargada |

---

## E. Mejora de diseño: los emojis pasan a ser iconos

### E27 · Los iconos de categoría eran emojis
Las 9 categorías guardaban un emoji en `categories.icon` (`👕`, `👖`, `👟`…).
Tres problemas reales:

1. **Cada sistema operativo los dibuja distinto**: en Windows salen planos y con
   otra paleta que en macOS o Android. El aspecto del sitio dependía del equipo
   del visitante.
2. **No combinaban** con los ~30 iconos de `lucide-react` del resto de la
   interfaz (trazo fino monocromo) — un emoji a color junto al carrito lucide
   rompía la coherencia visual.
3. **Fueron lo primero que se rompió** con el fallo de codificación del punto D26.

**Librería elegida: `@phosphor-icons/react` (MIT), peso `regular`.** Se compararon
cuatro candidatas instalándolas y listando su inventario real:

| Categoría | Phosphor | Tabler | lucide (la que ya estaba) |
|---|---|---|---|
| Polos | `TShirt` | `IconShirt` | `Shirt` |
| Pantalones | **`Pants`** | ❌ | ❌ |
| Casacas | **`Hoodie`** | `IconJacket` | ❌ |
| Gorras | **`BaseballCap`** | ❌ | ❌ |
| Zapatillas | **`Sneaker`** | `IconShoe` | ❌ |
| Mochilas | `Backpack` | `IconBackpack` | `Backpack` |
| Relojes | `Watch` | `IconDeviceWatch` | `Watch` |
| Lentes | `Sunglasses` | `IconSunglasses` | `Glasses` |
| Accesorios | `Belt` | `IconSock` | ❌ |

Phosphor es la única que cubre las nueve, y precisamente con el léxico de moda
urbana. Se descartó **Material Symbols (MD3)** porque es el lenguaje visual de
Android: sus iconos rellenos desentonan junto a los lucide de trazo fino, y su
vocabulario de moda es mucho más pobre.

**Cómo quedó implementado.** No se cablearon los iconos por slug en el código:
la columna `categories.icon` ahora guarda el **nombre** del icono (`zapatilla`,
`pantalon`…) y `ecommerce/src/components/CategoriaIcono.jsx` lo resuelve al
componente, con caída a un icono genérico si el nombre no existe. Así la
categoría sigue siendo un dato de la base y **el administrador elige el icono
desde el panel**, donde el antiguo campo de texto "Icono (emoji)" se sustituyó
por una paleta visual de 14 iconos con el nombre del seleccionado debajo.

Archivos: `CategoriaIcono.jsx` (nuevo), `Home.jsx`, `Sidebar.jsx`,
`admin/Categories.jsx`, `001_init_schema.sql` (la columna pasa de `VARCHAR(10)`
a `VARCHAR(40)`: los nombres no caben en 10), `002_seed_data.sql`, y
`003_iconos_categorias.sql` (nuevo, para bases ya cargadas).

**Coste:** el paquete de producción pasa de 462 kB a 515 kB (135 → 151 kB con
gzip). Phosphor incluye 6 pesos por icono y solo se usa uno; se probó importar
desde `/dist/ssr` y no mejora, porque los pesos van dentro del mismo módulo.
Es el precio de tener iconos de moda de verdad en lugar de dibujarlos a mano.

### E29 · El panel administrativo: hueco muerto arriba y sin navegación en móvil
`AdminLayout` reservaba 64–80 px con `pt-16 lg:pt-20` y anclaba la barra lateral
con `sticky top-20` para compensar el navbar fijo de la tienda… que en las rutas
`/admin` **no se renderiza**. El resultado era una franja vacía en la parte
superior y un sidebar colgado de una barra invisible. Además el `<aside>` era
`hidden lg:flex` **sin alternativa**: por debajo de 1024 px el panel se quedaba
sin ninguna forma de navegar ni de volver a la tienda.

**Corregido:** el hueco pasa a **0 px** (medido en el navegador), y el panel gana
una barra superior propia con miga de pan (`Panel admin / Sección`), acceso a la
tienda, el usuario conectado y cierre de sesión. En móvil hay botón hamburguesa y
un cajón lateral con los 8 destinos más "Volver a la tienda".

### E30 · El resumen del panel no medía nada del negocio
Las cuatro cifras se calculaban **en el navegador**: `adminGetOrders()` y
`adminGetUsers()` se descargaban las tablas **completas** de pedidos y usuarios
solo para hacerles `.length`. Con volumen real es la petición más cara del panel
y, de paso, enviaba al cliente el nombre y el correo de todos los compradores para
acabar mostrando un número. No había ninguna métrica de dinero.

Otros tres defectos concretos: la etiqueta decía "Productos activos" pero el
número incluía también los agotados; los `.catch()` devolvían valores vacíos, así
que con la API caída el panel pintaba **cuatro ceros como si fueran datos reales**;
y la tabla de stock bajo renderizaba las 113 filas de golpe sin avisar.

**Corregido:** nuevo endpoint `GET /api/admin/stats` que resuelve todo con
agregados en SQL (`COUNT(*) FILTER`, `SUM`, `AVG`, `GROUP BY`) en **una sola
petición**. El panel ahora muestra:

| | |
|---|---|
| Dinero | Ingresos (excluyendo cancelados), ticket promedio, descuentos concedidos |
| Pedidos | Total y **reparto por estado** con barras de proporción |
| Catálogo | Activos, agotados e inactivos por separado |
| Inventario | Unidades totales, variantes bajo mínimo **con su porcentaje**, y agotadas |
| Actividad | Los 5 más vendidos (unidades e ingresos reales de `order_items`) y los 5 últimos pedidos |

Con esqueletos de carga, estado de error con botón de reintento, y la lista de
stock crítico acotada a las 10 más urgentes indicando cuántas quedan fuera.

Medido en tu base: **S/ 1.089,42 de ingresos · S/ 181,57 de ticket promedio ·
744 unidades en stock · 112 de 145 variantes bajo mínimo (77 %)**.

> Nota: `/api/admin/stats` es funcionalidad **nueva**, no parte del port. Existe
> solo en el backend Node; el PHP no la tiene. El comparador diferencial verifica
> la paridad de las 52 rutas portadas, no de esta.

### E28 · Símbolos sueltos en el texto
Quedaban tres caracteres decorativos usados como si fueran iconos:
`"4.9★"` en el hero (que además ya tenía un icono `Star` al lado), `"Hecho con
❤️ en Perú"` en el pie, y una flecha `→` escrita a mano en el enlace del perfil.

**Corregido:** el `★` se quita (el icono ya estaba), y el `❤️` y la `→` pasan a
ser componentes `Heart` y `ArrowRight` de lucide. Verificado en el navegador:
**0 emojis** en el DOM de la portada.

---

### Prueba funcional de punta a punta (ejecutada contra la base real)

| Prueba | Resultado |
|---|---|
| Tienda en `localhost:5173` | ✅ Carga los 36 productos desde la API |
| Acentos y emojis | ✅ `💼 Accesorios`, `Pantalón Chino Slim`, `Stan Smith Clásico` |
| Login admin `admin@urbanstyle.pe` / `Admin123!` | ✅ rol `admin` |
| Registro de cliente | ✅ rol `cliente`, tildes y ñ correctas (`María Pérez Ñuñez`) |
| **Compra completa con cupón `BIENVENIDA10`** | ✅ subtotal S/230.38 − descuento S/23.04 + envío S/0.00 = **S/207.34** |
| Cuadre aritmético del pedido | ✅ exacto |
| Descuento del 10 % aplicado | ✅ |
| **Descuento de stock** | ✅ 3 → 1 |
| Snapshot del nombre en la línea | ✅ `"Pantalón Chino Slim"` con tilde |
| Historial del cliente | ✅ |
| **Aislamiento entre clientes (IDOR)** | ✅ otro cliente recibe 404; el dueño, 200 |
| `/ofertas` | ✅ 12 productos, **todos** con descuento |
| `/products/sizes` (endpoint nuevo) | ✅ 23 tallas reales |
| Los 8 endpoints del panel | ✅ responden |
| Sin token / con token de cliente | ✅ 401 / 403 |
| Desactivar producto | ✅ panel lo ve · tienda lo oculta · detalle público 404 |
| `ajuste` de inventario | ✅ **fija** el stock (antes sumaba) |

### Rechazos que antes se colaban

| Intento | Respuesta |
|---|---|
| Pedido sin `variant_id` | `400 Debes elegir una talla para "Air Force 1 Classic".` |
| Cantidad negativa o cero | `400 La cantidad de cada producto debe ser un entero mayor que 0.` |
| Variante de otro producto | `400 La variante seleccionada no corresponde a "Air Force 1 Classic".` |
| Dos líneas que juntas superan el stock | `400 Stock insuficiente para Air Force 1 Classic (talla 40).` |
| Carrito vacío | `400 El carrito está vacío.` |
