import * as servicio from '../servicios/categorias.js'
import { exito, error } from '../utils/respuesta.js'
import validar from '../utils/validador.js'

/**
 * Express 4 no captura las promesas rechazadas de un manejador `async`: sin este
 * envoltorio, un fallo de Prisma dejaría la petición colgada en lugar de llegar
 * al manejador central de errores de app.js.
 */
const envolver = (manejador) => (req, res, next) => manejador(req, res).catch(next)

/** GET /api/categories — la tienda solo ve las activas. */
export const indice = envolver(async (req, res) => {
  exito(res, await servicio.listar(true))
})

/** GET /api/admin/categories — el panel ve TODAS, para poder reactivarlas. */
export const indiceAdmin = envolver(async (req, res) => {
  exito(res, await servicio.listar(false))
})

export const crear = envolver(async (req, res) => {
  const datos = req.body ?? {}

  const errores = validar(datos, { name: 'required|min:2' })
  if (Object.keys(errores).length > 0) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  return exito(res, await servicio.crear(datos), 'Categoría creada.', 201)
})

export const actualizar = envolver(async (req, res) => {
  await servicio.actualizar(req.params.id, req.body ?? {})
  exito(res, null, 'Categoría actualizada.')
})

export const eliminar = envolver(async (req, res) => {
  await servicio.eliminar(req.params.id)
  exito(res, null, 'Categoría eliminada.')
})
