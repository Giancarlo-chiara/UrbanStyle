import express from 'express'
import cors from 'cors'
import { exito, error, ErrorDeNegocio } from './utils/respuesta.js'

import rutasCatalogo from './rutas/catalogo.js'
import rutasAuth from './rutas/auth.js'
import rutasUsuarios from './rutas/usuarios.js'
import rutasPedidos from './rutas/pedidos.js'
import rutasFavoritos from './rutas/favoritos.js'
import rutasAdminProductos from './rutas/admin-productos.js'
import rutasAdminCatalogo from './rutas/admin-catalogo.js'
import rutasAdminUsuarios from './rutas/admin-usuarios.js'
import rutasAdminPedidos from './rutas/admin-pedidos.js'
import rutasAdminInventario from './rutas/admin-inventario.js'
import rutasAdminPromociones from './rutas/admin-promociones.js'
import rutasAdminEstadisticas from './rutas/admin-estadisticas.js'

export const app = express()

app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

/*
 * CORS. Al desplegar el frontend y la API bajo el MISMO dominio en Vercel
 * (el frontend estático y la API en /api), esto deja de hacer falta: no hay
 * dos orígenes. Se mantiene para el desarrollo local, donde Vite corre en
 * el 5173 y la API en el 8000.
 *
 * Se acepta una lista separada por comas y se compara contra el origen de la
 * petición, en lugar de reflejar un único valor a ciegas como hacía la versión
 * en PHP —que además emitía `Allow-Credentials: true` junto a `*` cuando faltaba
 * el .env, combinación que los navegadores rechazan.
 */
const origenesPermitidos = (process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origen, cb) {
      if (!origen) return cb(null, true) // curl, Postman, mismo origen
      return cb(null, origenesPermitidos.includes(origen))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // evita un preflight por cada PUT/DELETE del panel
  })
)

// ---- Rutas -----------------------------------------------------------------
app.get('/api/health', (req, res) =>
  exito(res, { status: 'up' }, 'UrbanStyle API funcionando.')
)

app.use('/api', rutasCatalogo)
app.use('/api/auth', rutasAuth)
app.use('/api/users', rutasUsuarios)
app.use('/api/orders', rutasPedidos)
app.use('/api/favorites', rutasFavoritos)

// stats debe ir ANTES que el router montado en '/api/admin', para que no lo capture.
app.use('/api/admin/stats', rutasAdminEstadisticas)
app.use('/api/admin/products', rutasAdminProductos)
app.use('/api/admin', rutasAdminCatalogo) // categories + brands
app.use('/api/admin/users', rutasAdminUsuarios)
app.use('/api/admin/orders', rutasAdminPedidos)
app.use('/api/admin/inventory', rutasAdminInventario)
app.use('/api/admin/promotions', rutasAdminPromociones)

// ---- Ruta no encontrada ----------------------------------------------------
// Usa el mismo envoltorio que el resto. En PHP el 404 del router emitía una
// tercera forma de error distinta (sin la clave `errors`), así que un cliente
// que leyera `errors` de forma uniforme fallaba justo en ese caso.
app.use((req, res) => error(res, `Ruta no encontrada: ${req.path}`, 404))

// ---- Manejo central de errores --------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err instanceof ErrorDeNegocio) {
    return error(res, err.message, err.status, err.errors)
  }

  // Errores conocidos de Prisma que corresponden a un fallo del cliente, no del
  // servidor. En PHP estos salían como 500 con el texto crudo de PostgreSQL.
  if (err?.code === 'P2002') {
    return error(res, 'Ya existe un registro con ese valor único.', 409)
  }
  if (err?.code === 'P2003') {
    return error(res, 'La operación viola una referencia entre tablas.', 409)
  }
  if (err?.code === 'P2025') {
    return error(res, 'El recurso no existe.', 404)
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return error(res, 'El cuerpo de la petición no es JSON válido.', 400)
  }

  // Cualquier otra cosa es un fallo nuestro: se registra completo en el servidor
  // y al cliente solo se le devuelve el detalle si NO estamos en producción.
  console.error('[error no controlado]', err)

  const enProduccion = process.env.NODE_ENV === 'production'
  return error(
    res,
    'Error interno del servidor.',
    500,
    enProduccion ? null : { exception: err?.message ?? String(err) }
  )
})

export default app
