import prisma from '../config/prisma.js'
import { ErrorDeNegocio } from '../utils/respuesta.js'
import * as productosServicio from './productos.js'

/**
 * Reglas propias del PANEL de productos.
 *
 * La escritura de productos, imágenes y variantes la hace `servicios/productos.js`
 * (dominio de catálogo, compartido con la tienda). Aquí viven solo las reglas que
 * el panel añade encima y que la tienda no necesita:
 *
 *   - existir antes de tocar: 404 en vez de un 500 por clave ajena;
 *   - una sola imagen principal por producto;
 *   - una sola variante por (producto, talla, color);
 *   - un producto con ventas no se borra.
 */

/** `servicios/productos.js` puede devolver el id suelto o la fila creada. */
const idDe = (resultado) =>
  resultado !== null && typeof resultado === 'object' ? resultado.id : resultado

/**
 * Convierte a BigInt solo si el valor es un entero positivo de verdad; si no,
 * devuelve null. Así un `category_id` de 3.5 se trata como "no existe" en lugar de
 * reventar más abajo al construir el BigInt.
 */
function aId(valor) {
  const numero = Number(valor)
  return Number.isInteger(numero) && numero > 0 ? BigInt(numero) : null
}

const presente = (valor) => valor !== undefined && valor !== null && valor !== ''

/** Un DELETE bloqueado por una referencia: en PostgreSQL es el SQLSTATE 23503. */
const esViolacionDeReferencia = (err) =>
  err?.code === 'P2003' || err?.meta?.code === '23503' || err?.code === '23503'

/**
 * Comprueba que la categoría, la subcategoría y la marca existan.
 *
 * El PHP las pasaba directas al INSERT, así que un id inventado salía como 500 con
 * el texto crudo de PostgreSQL. Aquí es un 422 con el campo señalado, igual que
 * cualquier otro dato inválido.
 */
async function verificarReferencias(datos) {
  const errores = {}

  if (presente(datos.category_id)) {
    const id = aId(datos.category_id)
    if (!id || !(await prisma.categories.count({ where: { id } }))) {
      errores.category_id = ['La categoría indicada no existe.']
    }
  }

  if (presente(datos.subcategory_id)) {
    const id = aId(datos.subcategory_id)
    if (!id || !(await prisma.categories.count({ where: { id } }))) {
      errores.subcategory_id = ['La subcategoría indicada no existe.']
    }
  }

  if (presente(datos.brand_id)) {
    const id = aId(datos.brand_id)
    if (!id || !(await prisma.brands.count({ where: { id } }))) {
      errores.brand_id = ['La marca indicada no existe.']
    }
  }

  if (Object.keys(errores).length) {
    throw new ErrorDeNegocio('Datos inválidos.', 422, errores)
  }
}

async function exigirProducto(id) {
  const producto = await productosServicio.buscarPorId(id)
  if (!producto) {
    throw new ErrorDeNegocio('Producto no encontrado.', 404)
  }
  return producto
}

export function listar(filtros) {
  // El segundo argumento es lo que distingue al panel de la tienda: el admin SÍ ve
  // los productos inactivos.
  return productosServicio.listar(filtros, true)
}

export function buscarPorId(id) {
  return productosServicio.buscarPorId(id)
}

export async function crear(datos) {
  await verificarReferencias(datos)
  const id = idDe(await productosServicio.crear(datos))
  return productosServicio.buscarPorId(id)
}

export async function actualizar(id, datos) {
  await exigirProducto(id)
  await verificarReferencias(datos)

  // Cuerpo sin ningún campo editable: se devuelve el producto tal cual, sin tocar
  // la base. Es lo que hacía el PHP (su UPDATE sin columnas devolvía false y la
  // respuesta seguía siendo 200).
  if (Object.keys(datos).length) {
    await productosServicio.actualizar(id, datos)
  }

  return productosServicio.buscarPorId(id)
}

export async function eliminar(id) {
  await exigirProducto(id)

  try {
    await productosServicio.eliminar(id)
  } catch (err) {
    // `order_items` referencia el producto con ON DELETE RESTRICT. Las demás
    // relaciones (imágenes, variantes, favoritos, reseñas) van en CASCADE, así que
    // una violación de referencia aquí solo puede significar una cosa.
    if (esViolacionDeReferencia(err)) {
      throw new ErrorDeNegocio('No se puede eliminar: el producto tiene ventas registradas.', 409)
    }
    throw err
  }
}

/**
 * La primera imagen de un producto queda como principal aunque no se pida, y al
 * marcar una como principal se DESMARCAN las demás.
 *
 * El PHP dejaba varias imágenes con `is_primary = true` a la vez; la que ganaba
 * dependía del orden que devolviera PostgreSQL, así que la miniatura del catálogo
 * podía cambiar entre dos peticiones idénticas.
 */
export async function anadirImagen(productoId, url, esPrincipal = false) {
  await exigirProducto(productoId)

  const existentes = await prisma.product_images.count({
    where: { product_id: BigInt(productoId) },
  })
  const principal = existentes === 0 ? true : Boolean(esPrincipal)

  if (principal && existentes > 0) {
    await prisma.product_images.updateMany({
      where: { product_id: BigInt(productoId) },
      data: { is_primary: false },
    })
  }

  return idDe(await productosServicio.anadirImagen(productoId, url, principal))
}

export async function quitarImagen(imagenId) {
  const imagen = await prisma.product_images.findUnique({ where: { id: BigInt(imagenId) } })
  if (!imagen) {
    throw new ErrorDeNegocio('Imagen no encontrada.', 404)
  }
  await productosServicio.quitarImagen(imagenId)
}

export async function anadirVariante(productoId, datos) {
  await exigirProducto(productoId)

  const duplicada = await prisma.product_variants.findUnique({
    where: {
      product_id_size_color: {
        product_id: BigInt(productoId),
        size: datos.size,
        color: datos.color,
      },
    },
  })
  if (duplicada) {
    throw new ErrorDeNegocio('Ya existe una variante con esa talla y color para este producto.', 409)
  }

  try {
    return idDe(await productosServicio.anadirVariante(productoId, datos))
  } catch (err) {
    // Red de seguridad para dos peticiones simultáneas con la misma combinación:
    // la comprobación de arriba no las ve, el índice único sí.
    if (err?.code === 'P2002') {
      throw new ErrorDeNegocio('Ya existe una variante con esa talla y color para este producto.', 409)
    }
    throw err
  }
}

async function exigirVariante(varianteId) {
  const variante = await prisma.product_variants.findUnique({ where: { id: BigInt(varianteId) } })
  if (!variante) {
    throw new ErrorDeNegocio('Variante no encontrada.', 404)
  }
  return variante
}

export async function actualizarStockVariante(varianteId, stock) {
  await exigirVariante(varianteId)
  await productosServicio.actualizarStockVariante(varianteId, stock)
}

export async function eliminarVariante(varianteId) {
  await exigirVariante(varianteId)

  try {
    await productosServicio.eliminarVariante(varianteId)
  } catch (err) {
    // `order_items.variant_id` también es RESTRICT: una variante vendida no se
    // puede borrar sin perder el rastro de qué se vendió exactamente.
    if (esViolacionDeReferencia(err)) {
      throw new ErrorDeNegocio('No se puede eliminar: la variante tiene ventas registradas.', 409)
    }
    throw err
  }
}
