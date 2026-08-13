import { exito, error } from '../utils/respuesta.js'
import validar from '../utils/validador.js'
import * as adminProductos from '../servicios/admin-productos.js'

/**
 * Express 4 no captura el rechazo de un manejador async, así que sin este
 * envoltorio una promesa rota se quedaría colgada sin respuesta en lugar de llegar
 * al manejador central de errores de app.js.
 */
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/** Id de la URL: BigInt si es un entero positivo, null si no lo es. */
const aId = (valor) => (/^\d+$/.test(String(valor)) ? BigInt(valor) : null)

/*
 * Campos que el cliente PUEDE enviar. Es una lista blanca, no una lista negra, por
 * dos razones:
 *
 *   - `final_price` es una columna GENERATED ALWAYS de PostgreSQL: cualquier
 *     intento de escribirla, incluso con el valor correcto, rechaza el INSERT
 *     entero (error 428C9).
 *   - `slug` lo genera el servicio de productos a partir del nombre. Si lo pusiera
 *     el cliente, podría chocar con el de otro producto o suplantar una URL.
 */
const CAMPOS_EDITABLES = [
  'category_id',
  'subcategory_id',
  'brand_id',
  'name',
  'description',
  'price',
  'discount_percent',
  'status',
  'is_featured',
]

/** En el create se aceptan además las colecciones que el servicio crea de golpe. */
const CAMPOS_CREAR = [...CAMPOS_EDITABLES, 'images', 'variants']

const REGLAS_PRODUCTO = {
  name: 'required|min:3|max:200',
  category_id: 'required|numeric',
  brand_id: 'required|numeric',
  subcategory_id: 'numeric',
  price: 'required|numeric|between:0,99999999',
  discount_percent: 'numeric|between:0,100',
  status: 'in:activo,inactivo,agotado',
}

function soloCampos(cuerpo, permitidos) {
  const datos = {}
  for (const campo of permitidos) {
    if (Object.hasOwn(cuerpo ?? {}, campo)) datos[campo] = cuerpo[campo]
  }
  return datos
}

/**
 * El PUT es parcial: se validan las reglas de los campos que vienen y se ignoran
 * las de los que no. Así `{ status: 'agotado' }` no exige reenviar el nombre y el
 * precio, pero un `status` inventado sigue siendo un 422.
 */
function esquemaParcial(datos) {
  const esquema = {}
  for (const [campo, reglas] of Object.entries(REGLAS_PRODUCTO)) {
    if (Object.hasOwn(datos, campo)) esquema[campo] = reglas
  }
  return esquema
}

export const listar = asincrono(async (req, res) => {
  const filtros = { ...req.query, limit: req.query.limit ?? 100 }
  return exito(res, await adminProductos.listar(filtros))
})

export const detalle = asincrono(async (req, res) => {
  const id = aId(req.params.id)
  const producto = id && (await adminProductos.buscarPorId(id))
  if (!producto) {
    return error(res, 'Producto no encontrado.', 404)
  }
  return exito(res, producto)
})

export const crear = asincrono(async (req, res) => {
  const datos = soloCampos(req.body, CAMPOS_CREAR)

  const errores = validar(datos, REGLAS_PRODUCTO)
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  return exito(res, await adminProductos.crear(datos), 'Producto creado.', 201)
})

export const actualizar = asincrono(async (req, res) => {
  const id = aId(req.params.id)
  if (!id) {
    return error(res, 'Producto no encontrado.', 404)
  }

  const datos = soloCampos(req.body, CAMPOS_EDITABLES)
  const errores = validar(datos, esquemaParcial(datos))
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  return exito(res, await adminProductos.actualizar(id, datos), 'Producto actualizado.')
})

export const eliminar = asincrono(async (req, res) => {
  const id = aId(req.params.id)
  if (!id) {
    return error(res, 'Producto no encontrado.', 404)
  }

  await adminProductos.eliminar(id)
  return exito(res, null, 'Producto eliminado.')
})

export const anadirImagen = asincrono(async (req, res) => {
  const id = aId(req.params.id)
  if (!id) {
    return error(res, 'Producto no encontrado.', 404)
  }

  // Se conserva el mensaje textual del PHP para el caso de la url ausente; la
  // comprobación de longitud es nueva (la columna es VARCHAR(500) y pasarse era
  // un 500 de PostgreSQL).
  const { url, is_primary: esPrincipal } = req.body ?? {}
  if (url === undefined || url === null || String(url).trim() === '') {
    return error(res, 'url es requerida.', 422)
  }
  const errores = validar({ url }, { url: 'max:500' })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  const imagenId = await adminProductos.anadirImagen(id, String(url).trim(), esPrincipal ?? false)
  return exito(res, { id: imagenId }, 'Imagen agregada.', 201)
})

export const quitarImagen = asincrono(async (req, res) => {
  const imagenId = aId(req.params.imageId)
  if (!imagenId) {
    return error(res, 'Imagen no encontrada.', 404)
  }

  await adminProductos.quitarImagen(imagenId)
  return exito(res, null, 'Imagen eliminada.')
})

export const anadirVariante = asincrono(async (req, res) => {
  const id = aId(req.params.id)
  if (!id) {
    return error(res, 'Producto no encontrado.', 404)
  }

  const { size, color, sku, stock } = req.body ?? {}

  // El PHP rellenaba las ausencias con 'Única' y 'Estándar', así que un formulario
  // a medio enviar creaba una variante que nadie había pedido —y, al ser la
  // combinación única, bloqueaba el hueco para la de verdad.
  const errores = validar(
    { size, color, sku, stock },
    {
      size: 'required|max:20',
      color: 'required|max:40',
      sku: 'max:80',
      stock: 'integer|between:0,999999',
    }
  )
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  const varianteId = await adminProductos.anadirVariante(id, {
    size: String(size).trim(),
    color: String(color).trim(),
    sku: sku === undefined || sku === null || String(sku).trim() === '' ? null : String(sku).trim(),
    stock: stock === undefined || stock === null || stock === '' ? 0 : Number(stock),
  })
  return exito(res, { id: varianteId }, 'Variante agregada.', 201)
})

export const actualizarVariante = asincrono(async (req, res) => {
  const varianteId = aId(req.params.variantId)
  if (!varianteId) {
    return error(res, 'Variante no encontrada.', 404)
  }

  // `stock` es obligatorio a propósito. El PHP hacía `(int)($data['stock'] ?? 0)`:
  // un cuerpo sin la clave, o con un typo en su nombre, vaciaba el stock de la
  // variante sin que nadie lo hubiera pedido.
  const errores = validar(req.body ?? {}, { stock: 'required|integer|between:0,999999' })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  await adminProductos.actualizarStockVariante(varianteId, Number(req.body.stock))
  return exito(res, null, 'Variante actualizada.')
})

export const eliminarVariante = asincrono(async (req, res) => {
  const varianteId = aId(req.params.variantId)
  if (!varianteId) {
    return error(res, 'Variante no encontrada.', 404)
  }

  await adminProductos.eliminarVariante(varianteId)
  return exito(res, null, 'Variante eliminada.')
})
