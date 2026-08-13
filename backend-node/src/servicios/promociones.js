import { ErrorDeNegocio } from '../utils/respuesta.js'
import validar from '../utils/validador.js'
import * as promociones from '../repositorios/promociones.js'

const VALORES_APLICA_A = ['todo', 'categoria', 'producto']

/** Un valor que el cliente manda "en blanco": no hay dato. */
const ausente = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

const tiene = (datos, campo) => Object.prototype.hasOwnProperty.call(datos ?? {}, campo)

/**
 * El formulario del panel envía las casillas como booleano, pero un cliente
 * distinto podría mandar 0/1 o "false" en el JSON.
 */
const aBooleano = (v) => !(
  v === false || v === 0 || v === '0' || v === '' || v === null || v === undefined
  || String(v).toLowerCase() === 'false'
)

/**
 * Valida y normaliza el cuerpo de una promoción, y devuelve solo las columnas
 * que hay que escribir. Si algo no cuadra lanza un único 422 con todos los
 * errores juntos, con la misma forma { campo: [mensajes] } de la API en PHP.
 *
 * Se usa tanto al crear como al actualizar. En la actualización se pasa la fila
 * existente, porque las reglas que cruzan dos campos hay que comprobarlas sobre
 * el estado RESULTANTE: un PUT que solo trae `discount_amount` puede dejar la
 * promoción con dos descuentos a la vez, y eso no se ve mirando el cuerpo.
 *
 * La versión en PHP no validaba nada de esto (solo que el código tuviera 3
 * caracteres) y guardaba promociones imposibles de aplicar: sin descuento, con
 * los dos descuentos, con `applies_to = 'categoria'` y sin categoría, o con un
 * rango de fechas invertido.
 *
 * @param {Record<string, unknown>} datos
 * @param {object|null} actual fila existente, o null al crear
 */
function prepararColumnas(datos, actual = null) {
  const esCreacion = actual === null
  const errores = {}
  const columnas = {}

  // --- code ----------------------------------------------------------------
  if (esCreacion || tiene(datos, 'code')) {
    // Se normaliza ANTES de medir la longitud, para que "  ab  " no cuele.
    const code = ausente(datos.code) ? null : String(datos.code).trim().toUpperCase()
    const error = validar({ code }, { code: 'required|min:3|max:40' })
    if (error.code) errores.code = error.code
    else columnas.code = code
  }

  // --- description ---------------------------------------------------------
  if (tiene(datos, 'description')) {
    const description = ausente(datos.description) ? null : String(datos.description).trim()
    const error = validar({ description }, { description: 'max:255' })
    if (error.description) errores.description = error.description
    else columnas.description = description
  }

  // --- descuentos ----------------------------------------------------------
  if (tiene(datos, 'discount_percent')) {
    if (ausente(datos.discount_percent)) {
      columnas.discount_percent = null
    } else {
      const error = validar(datos, { discount_percent: 'numeric|between:0,100' })
      if (error.discount_percent) errores.discount_percent = error.discount_percent
      else columnas.discount_percent = Number(datos.discount_percent)
    }
  }

  if (tiene(datos, 'discount_amount')) {
    if (ausente(datos.discount_amount)) {
      columnas.discount_amount = null
    } else {
      // El techo es el de NUMERIC(10,2); sin él, un importe mayor reventaría
      // como error de PostgreSQL en lugar de 422.
      const error = validar(datos, { discount_amount: 'numeric|between:0,99999999.99' })
      if (error.discount_amount) errores.discount_amount = error.discount_amount
      else columnas.discount_amount = Number(datos.discount_amount)
    }
  }

  // --- applies_to ----------------------------------------------------------
  if (esCreacion || tiene(datos, 'applies_to')) {
    const appliesTo = ausente(datos.applies_to) ? 'todo' : String(datos.applies_to).trim()
    const error = validar({ applies_to: appliesTo }, { applies_to: `in:${VALORES_APLICA_A.join(',')}` })
    if (error.applies_to) errores.applies_to = error.applies_to
    else columnas.applies_to = appliesTo
  }

  // --- category_id / product_id -------------------------------------------
  for (const campo of ['category_id', 'product_id']) {
    if (!tiene(datos, campo)) continue

    if (ausente(datos[campo])) {
      columnas[campo] = null
      continue
    }

    const error = validar(datos, { [campo]: 'integer' })
    if (error[campo]) errores[campo] = error[campo]
    else columnas[campo] = BigInt(Number(datos[campo])) // "5.0" pasaría a BigInt('5.0') y lanzaría
  }

  // --- fechas --------------------------------------------------------------
  for (const campo of ['starts_at', 'ends_at']) {
    if (!tiene(datos, campo)) continue

    if (ausente(datos[campo])) {
      // El formulario manda cadena vacía cuando el campo de fecha queda sin
      // rellenar. En PHP eso llegaba tal cual al TIMESTAMPTZ y lo rechazaba
      // PostgreSQL con un 500.
      columnas[campo] = null
      continue
    }

    const fecha = new Date(datos[campo])
    if (Number.isNaN(fecha.getTime())) errores[campo] = [`El campo ${campo} no es una fecha válida.`]
    else columnas[campo] = fecha
  }

  // --- active --------------------------------------------------------------
  if (esCreacion || tiene(datos, 'active')) {
    columnas.active = tiene(datos, 'active') ? aBooleano(datos.active) : true
  }

  // --- reglas que cruzan campos, sobre el estado resultante ----------------
  const efectivo = (campo) => (campo in columnas ? columnas[campo] : (actual?.[campo] ?? null))

  const hayPorcentaje = !ausente(efectivo('discount_percent'))
  const hayMonto = !ausente(efectivo('discount_amount'))
  if (hayPorcentaje === hayMonto && !errores.discount_percent && !errores.discount_amount) {
    errores.discount_percent = [hayPorcentaje
      ? 'Indica un porcentaje o un monto de descuento, pero no ambos.'
      : 'Indica un porcentaje o un monto de descuento.']
  }

  const aplicaA = efectivo('applies_to') ?? 'todo'
  if (aplicaA === 'categoria' && ausente(efectivo('category_id')) && !errores.category_id) {
    errores.category_id = ['El campo category_id es obligatorio cuando applies_to es "categoria".']
  }
  if (aplicaA === 'producto' && ausente(efectivo('product_id')) && !errores.product_id) {
    errores.product_id = ['El campo product_id es obligatorio cuando applies_to es "producto".']
  }

  const inicio = efectivo('starts_at')
  const fin = efectivo('ends_at')
  if (inicio && fin && !errores.starts_at && !errores.ends_at
      && new Date(fin).getTime() <= new Date(inicio).getTime()) {
    errores.ends_at = ['El campo ends_at debe ser posterior a starts_at.']
  }

  if (Object.keys(errores).length) {
    throw new ErrorDeNegocio('Datos inválidos.', 422, errores)
  }

  return columnas
}

export async function listar() {
  return promociones.listar()
}

export async function crear(datos) {
  const columnas = prepararColumnas(datos)

  // El código es UNIQUE. Sin esta comprobación, el choque saldría como el 409
  // genérico del manejador central, que no dice qué campo se repite.
  if (await promociones.buscarPorCodigo(columnas.code)) {
    throw new ErrorDeNegocio('Ya existe una promoción con ese código.', 409)
  }

  return promociones.crear(columnas)
}

export async function actualizar(id, datos) {
  const actual = await promociones.buscarPorId(id)
  if (!actual) {
    // En PHP el UPDATE de un id inexistente afectaba a cero filas y respondía
    // 200 'Promoción actualizada.', así que el panel decía que había guardado.
    throw new ErrorDeNegocio('Promoción no encontrada.', 404)
  }

  const columnas = prepararColumnas(datos, actual)

  if (columnas.code && columnas.code !== actual.code
      && await promociones.buscarPorCodigo(columnas.code)) {
    throw new ErrorDeNegocio('Ya existe una promoción con ese código.', 409)
  }

  if (!Object.keys(columnas).length) return actual

  return promociones.actualizar(id, columnas)
}

export async function eliminar(id) {
  if (!(await promociones.buscarPorId(id))) {
    throw new ErrorDeNegocio('Promoción no encontrada.', 404)
  }

  return promociones.eliminar(id)
}

/** Reexportada para el dominio de pedidos. */
export async function buscarActivaPorCodigo(code) {
  return promociones.buscarActivaPorCodigo(code)
}

export default { listar, crear, actualizar, eliminar, buscarActivaPorCodigo }
