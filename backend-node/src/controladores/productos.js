import * as servicio from '../servicios/productos.js'
import { exito, error } from '../utils/respuesta.js'

/**
 * Catálogo público de productos. Traducción de `App\Controllers\ProductController`.
 *
 * Express 4 no reenvía al manejador central el rechazo de una promesa: sin
 * envolver, un fallo de la base de datos dejaría la petición colgada hasta el
 * timeout del cliente en vez de responder 500. De ahí `manejar`.
 */
const manejar = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next)

export const listar = manejar(async (req, res) => exito(res, await servicio.listar(req.query)))

export const detalle = manejar(async (req, res) => {
  const producto = await servicio.buscarPorId(req.params.id)

  // El servicio no filtra por estado (el panel admin necesita ver los
  // inactivos), así que la visibilidad pública se decide aquí.
  if (!producto || producto.status === 'inactivo') {
    return error(res, 'Producto no encontrado.', 404)
  }
  return exito(res, producto)
})

export const tallas = manejar(async (req, res) => exito(res, await servicio.tallas()))

export const relacionados = manejar(async (req, res) =>
  exito(res, await servicio.relacionados(req.params.id))
)

// Las tres vistas de portada ignoran a propósito el resto de la query string:
// devuelven un array plano, sin el objeto de paginación.
export const destacados = manejar(async (req, res) => {
  const resultado = await servicio.listar({ featured: 1, limit: 8 })
  return exito(res, resultado.items)
})

export const novedades = manejar(async (req, res) => {
  const resultado = await servicio.listar({ isNew: 1, limit: 8 })
  return exito(res, resultado.items)
})

export const ofertas = manejar(async (req, res) => {
  const resultado = await servicio.listar({ onSale: 1, limit: 12 })
  return exito(res, resultado.items)
})
