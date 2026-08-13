import { exito, error } from '../utils/respuesta.js'
import validar from '../utils/validador.js'
import * as servicio from '../servicios/pedidos.js'
import { ESTADOS_PEDIDO } from '../servicios/pedidos.js'

/**
 * Express 4 no captura el rechazo de una promesa: si un `async` falla, la
 * petición se queda colgada hasta el tiempo de espera del cliente y el manejador
 * central de app.js nunca se entera. Este envoltorio encamina el error a `next`.
 */
const capturar = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// ---------------- Cliente ----------------

/**
 * POST /api/orders
 *
 * Solo se validan aquí los campos de la cabecera, que van a columnas VARCHAR(40)
 * y reventarían como 500 de PostgreSQL si llegan más largos. Las reglas del
 * carrito viven en el servicio, porque necesitan consultar la base de datos.
 */
export const crear = capturar(async (req, res) => {
  const cuerpo = req.body ?? {}

  const errores = validar(cuerpo, {
    address_id: 'integer',
    payment_method: 'max:40',
    promotion_code: 'max:40',
  })
  if (Object.keys(errores).length > 0) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  const orden = await servicio.realizarCompra(req.usuario.id, cuerpo)
  return exito(res, orden, 'Pedido creado exitosamente.', 201)
})

/** GET /api/orders */
export const listar = capturar(async (req, res) =>
  exito(res, await servicio.listarDelUsuario(req.usuario.id))
)

/** GET /api/orders/:id */
export const mostrar = capturar(async (req, res) =>
  exito(res, await servicio.buscarDelUsuario(req.params.id, req.usuario.id))
)

// ---------------- Administración ----------------

/** GET /api/admin/orders */
export const listarAdmin = capturar(async (req, res) =>
  exito(res, await servicio.listarTodos())
)

/** GET /api/admin/orders/:id */
export const mostrarAdmin = capturar(async (req, res) =>
  exito(res, await servicio.buscarDetalleAdmin(req.params.id))
)

/**
 * PUT /api/admin/orders/:id/status
 *
 * La versión en PHP solo comprobaba que `status` no viniera vacío, así que
 * cualquier cadena entraba en la columna y el pedido quedaba en un estado que
 * ninguna vista sabía pintar.
 */
export const actualizarEstado = capturar(async (req, res) => {
  const cuerpo = req.body ?? {}

  const errores = validar(cuerpo, {
    status: `required|in:${ESTADOS_PEDIDO.join(',')}`,
    note: 'max:255',
  })
  if (Object.keys(errores).length > 0) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  await servicio.cambiarEstado(req.params.id, cuerpo.status, cuerpo.note ?? null)
  return exito(res, null, 'Estado del pedido actualizado.')
})

export default {
  crear,
  listar,
  mostrar,
  listarAdmin,
  mostrarAdmin,
  actualizarEstado,
}
