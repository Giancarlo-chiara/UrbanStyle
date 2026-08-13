import { exito, error } from '../utils/respuesta.js'
import validar from '../utils/validador.js'
import * as favoritos from '../servicios/favoritos.js'

/** GET /api/favorites */
export async function listar(req, res) {
  return exito(res, await favoritos.listar(req.usuario.id))
}

/** POST /api/favorites — cuerpo { product_id } */
export async function agregar(req, res) {
  const bruto = req.body?.product_id

  // Mismo criterio que el `empty()` del PHP, que también descartaba el 0.
  if (bruto === null || bruto === undefined || String(bruto).trim() === '' || Number(bruto) === 0) {
    return error(res, 'product_id es requerido.', 422)
  }

  const errores = validar({ product_id: bruto }, { product_id: 'integer' })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  await favoritos.agregar(req.usuario.id, Number(bruto))
  return exito(res, null, 'Agregado a favoritos.', 201)
}

/** DELETE /api/favorites/:productId */
export async function eliminar(req, res) {
  const errores = validar(req.params, { productId: 'required|integer' })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  await favoritos.eliminar(req.usuario.id, Number(req.params.productId))
  return exito(res, null, 'Eliminado de favoritos.')
}

export default { listar, agregar, eliminar }
