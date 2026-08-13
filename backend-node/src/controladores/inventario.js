import { exito, error } from '../utils/respuesta.js'
import validar from '../utils/validador.js'
import * as inventarioServicio from '../servicios/inventario.js'

/** Ver la nota de `controladores/admin-productos.js`: Express 4 no captura async. */
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export const listar = asincrono(async (req, res) => exito(res, await inventarioServicio.listar()))

export const bajoStock = asincrono(async (req, res) => {
  // El acotado real (0..1000) lo aplica el servicio; aquí solo se decide el valor
  // por defecto cuando el parámetro no viene o no es un número.
  const numero = Number.parseInt(req.query.threshold ?? '', 10)
  return exito(res, await inventarioServicio.bajoStock(Number.isNaN(numero) ? 5 : numero))
})

export const registrar = asincrono(async (req, res) => {
  const { variant_id: varianteId, type: tipo, quantity: cantidad, reason: motivo } = req.body ?? {}

  const errores = validar(req.body ?? {}, {
    variant_id: 'required|integer',
    type: 'required|in:entrada,salida,ajuste',
    quantity: 'required|integer|between:1,999999',
    reason: 'max:255',
  })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  const movimiento = await inventarioServicio.registrar({
    varianteId: Number(varianteId),
    tipo,
    cantidad: Number(cantidad),
    motivo: motivo === undefined || motivo === null || String(motivo).trim() === '' ? null : String(motivo).trim(),
    registradoPor: req.usuario?.id ?? null,
  })

  return exito(res, { id: movimiento.id }, 'Movimiento de inventario registrado.', 201)
})
