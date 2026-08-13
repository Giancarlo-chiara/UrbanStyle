# UrbanStyle API — Node + Express + Prisma

API REST sobre **Node 20+**, **Express 4** y **Prisma 6** contra **PostgreSQL**.
Sustituye a la API original en PHP manteniendo el contrato HTTP **idéntico**: las
mismas 52 rutas, los mismos códigos y los mismos nombres de campo. El frontend no
necesitó ni un cambio.

## Por qué existe

El esquema de entrega del proyecto pide justificar **Node + Express** y
**PostgreSQL + Prisma**, y gestionar el esquema con **migraciones de Prisma**. La
primera versión estaba escrita en PHP puro con PDO, así que cumplía uno de los
tres puntos. Este backend cumple los tres, y de paso hace el proyecto desplegable
en Vercel, donde PHP no existe como runtime.

## Estructura

```
backend-node/
├── prisma/
│   └── schema.prisma      Generado con `prisma db pull` desde la base existente
├── src/
│   ├── server.js          Arranque local (en Vercel no se usa)
│   ├── app.js             Express, CORS, montaje de rutas y manejo de errores
│   ├── config/prisma.js   Cliente único de Prisma
│   ├── rutas/             11 routers, uno por área
│   ├── controladores/     Leen la petición, validan y responden
│   ├── servicios/         Reglas de negocio
│   ├── repositorios/      Acceso a datos (Prisma y $queryRaw)
│   ├── middleware/        Sesión y rol de administrador
│   └── utils/             respuesta · serializar · jwt · validador · slug
└── pruebas/
    └── comparar.mjs       Comparador diferencial contra la API en PHP
```

Se conserva a propósito la separación **Controlador → Servicio → Repositorio** de
la versión en PHP: es lo que se documenta en el informe y permite comparar ambas
implementaciones línea a línea.

## Puesta en marcha

```bash
npm install
node generar-env.mjs      # crea .env reutilizando las credenciales de backend/.env
npx prisma generate
npm run dev               # http://localhost:8000/api
```

`generar-env.mjs` construye el `DATABASE_URL` a partir del `.env` del backend PHP
y **reutiliza su `JWT_SECRET`**, así que los tokens ya emitidos siguen siendo
válidos: al cambiar de backend nadie pierde la sesión.

## Migraciones

El esquema se obtuvo por introspección de la base ya existente:

```bash
npx prisma db pull        # genera schema.prisma desde PostgreSQL
```

A partir de aquí los cambios se gestionan con Prisma:

```bash
npx prisma migrate dev --name descripcion-del-cambio   # desarrollo
npx prisma migrate deploy                              # producción
```

> Dos cosas que Prisma **no** gestiona en este esquema y conviene saber: las 5
> restricciones `CHECK` (`stock >= 0`, `discount_percent` entre 0 y 100, etc.) y
> el índice de expresión `idx_products_name_trgm`. Existen en la base y siguen
> funcionando, pero Prisma no las representa, así que hay que mantenerlas con SQL
> a mano en las migraciones.

## Tres detalles que decidieron el port

**1. Serialización.** Prisma y PDO no devuelven los mismos tipos. Los ids son
`BigInt` —que `JSON.stringify` **no puede serializar, lanza excepción**— y los
importes son `Decimal`, cuyo `toJSON` da `"349.9"` donde PDO daba `"349.90"`.
Todo se resuelve en `utils/serializar.js`, que aplica `exito()` a cada respuesta.
Las fechas sí cambian a propósito: ahora salen en ISO 8601 en vez del texto crudo
de PostgreSQL.

**2. `final_price` es una columna generada.** Prisma la expone como un campo
normal y dejaría intentar escribirla, pero PostgreSQL rechaza el `INSERT`/`UPDATE`
con el error `428C9`. Ningún create ni update la incluye.

**3. `$queryRaw` donde toca.** Las consultas del catálogo llevan subconsultas
correlacionadas (imagen principal, stock agregado) y nueve filtros dinámicos. Se
resuelven con `$queryRaw` y `Prisma.sql`, que es uso idiomático de Prisma para
consultas complejas y además permitió reutilizar el SQL de la versión en PHP casi
literalmente. El resto del CRUD usa la API del cliente.

## Verificación

```bash
node pruebas/comparar.mjs http://127.0.0.1:8000 http://127.0.0.1:8001
```

Lanza la misma secuencia a los dos backends y contrasta las respuestas: catálogo
con todos sus filtros y ordenamientos, 404, 401 sin token, los 8 endpoints del
panel, los 7 rechazos del checkout con sus mensajes exactos, una compra con cupón
comprobando importes y descuento de stock, y el aislamiento entre clientes.

**Resultado: 48 de 48 coinciden.**

## Diferencias deliberadas con la versión en PHP

Ninguna cambia el contrato; todas corrigen defectos documentados en
`CORRECCIONES.md`.

| Cambio | Motivo |
|---|---|
| Una sola forma de error | PHP tenía tres: `Response::error` con `errors`, el 404 del router sin `errors`, y el fallo de conexión con `error` en singular |
| Los 500 no filtran el mensaje interno en producción | Se controla con `NODE_ENV`; PHP devolvía siempre el texto de PostgreSQL |
| Estados y enumerados validados | PHP aceptaba cualquier cadena en el estado del pedido, del usuario y en `applies_to` |
| Un admin no puede degradarse, bloquearse ni borrarse, ni dejar el sistema sin administradores | PHP no lo impedía: era un bloqueo irrecuperable por API |
| `update`/`delete` responden 404 si el recurso no existe | PHP respondía 200 con mensaje de éxito |
| Salida de inventario mayor que el stock se rechaza | PHP usaba `GREATEST(0, ...)` y registraba en la auditoría una cantidad que nunca salió |
| Sin `JWT_SECRET` el arranque **falla** | PHP caía en un valor por defecto público con el que cualquiera podía firmarse un token de administrador |
| CORS con lista de orígenes | PHP reflejaba un único valor y emitía `Allow-Credentials: true` junto a `*` si faltaba el `.env` |
| El usuario autenticado viaja en `req.usuario` | PHP usaba `$GLOBALS`, lo que impedía probar los controladores en aislamiento |

## Pendiente

- El rol se lee del token y no se recontrasta con la base: degradar a un
  administrador no le retira el acceso hasta que caduque (7 días). Requiere token
  corto + refresco.
- El despliegue en Vercel necesita la cadena de conexión **agrupada** (*pooler*)
  del proveedor —Neon o Supabase— porque un entorno sin servidor abre muchas
  conexiones simultáneas.
