import { ErrorDeNegocio } from '../utils/respuesta.js'
import * as favoritos from '../repositorios/favoritos.js'

export async function listar(usuarioId) {
  return favoritos.listarPorUsuario(usuarioId)
}

/**
 * Marca un producto como favorito. Es idempotente: repetir la llamada no falla
 * ni duplica la fila.
 *
 * Se comprueba antes que el producto exista. La versión en PHP no lo hacía y
 * dejaba que PostgreSQL rechazara la clave ajena, así que un `product_id`
 * inventado salía como 500 (error del servidor) cuando en realidad el dato
 * enviado por el cliente era el equivocado.
 */
export async function agregar(usuarioId, productoId) {
  if (!(await favoritos.existeProducto(productoId))) {
    throw new ErrorDeNegocio('Datos inválidos.', 422, {
      product_id: ['El producto no existe.'],
    })
  }

  return favoritos.agregar(usuarioId, productoId)
}

/**
 * Quita el favorito. No es un error que no estuviera marcado: la operación pide
 * un estado final ("este producto no está en mis favoritos") y ese estado se
 * cumple igual, así que no se devuelve 404.
 */
export async function eliminar(usuarioId, productoId) {
  return favoritos.eliminar(usuarioId, productoId)
}

export default { listar, agregar, eliminar }
