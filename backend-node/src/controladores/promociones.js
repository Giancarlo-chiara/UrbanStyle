import { exito, error } from '../utils/respuesta.js'
import * as promociones from '../servicios/promociones.js'

/**
 * Un id que no es un entero no puede existir en la tabla, así que se responde
 * igual que si no se hubiera encontrado. Además evita que `BigInt('abc')` lance
 * una excepción dentro del repositorio.
 */
const esIdValido = (bruto) => /^\d+$/.test(String(bruto ?? '').trim())

/** GET /api/admin/promotions */
export async function listar(req, res) {
  return exito(res, await promociones.listar())
}

/** POST /api/admin/promotions */
export async function crear(req, res) {
  const promocion = await promociones.crear(req.body ?? {})
  // El cuerpo devuelve solo el id, como la API en PHP.
  return exito(res, { id: promocion.id }, 'Promoción creada.', 201)
}

/** PUT /api/admin/promotions/:id */
export async function actualizar(req, res) {
  if (!esIdValido(req.params.id)) {
    return error(res, 'Promoción no encontrada.', 404)
  }

  await promociones.actualizar(req.params.id, req.body ?? {})
  return exito(res, null, 'Promoción actualizada.')
}

/** DELETE /api/admin/promotions/:id */
export async function eliminar(req, res) {
  if (!esIdValido(req.params.id)) {
    return error(res, 'Promoción no encontrada.', 404)
  }

  await promociones.eliminar(req.params.id)
  return exito(res, null, 'Promoción eliminada.')
}

export default { listar, crear, actualizar, eliminar }
