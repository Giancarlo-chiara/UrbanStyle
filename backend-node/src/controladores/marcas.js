import * as servicio from '../servicios/marcas.js'
import { exito, error } from '../utils/respuesta.js'
import validar from '../utils/validador.js'

/** Ver la nota de `controladores/categorias.js` sobre Express 4 y las promesas. */
const envolver = (manejador) => (req, res, next) => manejador(req, res).catch(next)

/** GET /api/brands — la tienda solo ve las activas. */
export const indice = envolver(async (req, res) => {
  exito(res, await servicio.listar(true))
})

/** GET /api/admin/brands — el panel ve TODAS, para poder reactivarlas. */
export const indiceAdmin = envolver(async (req, res) => {
  exito(res, await servicio.listar(false))
})

export const crear = envolver(async (req, res) => {
  const datos = req.body ?? {}

  const errores = validar(datos, { name: 'required|min:2' })
  if (Object.keys(errores).length > 0) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  return exito(res, await servicio.crear(datos), 'Marca creada.', 201)
})

export const actualizar = envolver(async (req, res) => {
  await servicio.actualizar(req.params.id, req.body ?? {})
  exito(res, null, 'Marca actualizada.')
})

export const eliminar = envolver(async (req, res) => {
  await servicio.eliminar(req.params.id)
  exito(res, null, 'Marca eliminada.')
})
