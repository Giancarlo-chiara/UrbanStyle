import { randomBytes } from 'node:crypto'
import * as repositorio from '../repositorios/productos.js'

/**
 * Reglas de negocio de productos. Traducción de `App\Services\ProductService`.
 *
 * El panel administrativo reutiliza este mismo servicio (crear/actualizar/…),
 * igual que en PHP: allí `AdminProductController` recibía el mismo ProductService
 * que el controlador público.
 */

/** Equivalente de `empty()` de PHP, que es lo que decidía si regenerar el slug. */
const estaVacio = (valor) =>
  valor === undefined || valor === null || valor === false || valor === '' || valor === '0'

// ---------------------------------------------------------------------------
// Catálogo público
// ---------------------------------------------------------------------------

/**
 * @param {object} filtros query string tal cual llega
 * @param {boolean} incluirInactivos solo el panel admin lo pasa en true
 */
export async function listar(filtros = {}, incluirInactivos = false) {
  const [items, total] = await Promise.all([
    repositorio.buscarTodos(filtros, incluirInactivos),
    repositorio.contarTodos(filtros, incluirInactivos),
  ])

  // Mismo acotado que aplica el repositorio, para que la paginación cuadre.
  const limit = repositorio.acotarLimite(filtros.limit)

  return {
    items,
    pagination: {
      page: repositorio.acotarPagina(filtros.page),
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function buscarPorId(id) {
  return repositorio.buscarPorId(id)
}

export async function tallas() {
  return repositorio.buscarTallas()
}

export async function relacionados(id) {
  const producto = await repositorio.buscarPorId(id)
  if (!producto) return []
  return repositorio.buscarRelacionados(id, producto.category_id)
}

// ---------------------------------------------------------------------------
// CRUD que usa el panel administrativo
// ---------------------------------------------------------------------------

/**
 * Slug legible con sufijo aleatorio de 5 caracteres. El sufijo es lo que evita
 * el choque contra el UNIQUE de `products.slug` cuando dos productos comparten
 * nombre; en PHP salía de `substr(uniqid(), -5)`.
 */
export function slugify(texto) {
  const base = String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // quita las tildes: á -> a, ñ -> n
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${base}-${randomBytes(3).toString('hex').slice(-5)}`
}

export async function crear(datos) {
  const idProducto = await repositorio.crear({ ...datos, slug: slugify(datos.name) })

  if (Array.isArray(datos.images) && datos.images.length > 0) {
    // En serie y en orden: `sort_order` depende de la posición recibida.
    for (const [posicion, url] of datos.images.entries()) {
      await repositorio.anadirImagen(idProducto, url, posicion === 0, posicion)
    }
  }

  if (Array.isArray(datos.variants) && datos.variants.length > 0) {
    for (const variante of datos.variants) {
      await anadirVariante(idProducto, variante)
    }
  }

  return idProducto
}

export async function actualizar(id, datos = {}) {
  const cambios = { ...datos }
  if (cambios.name !== undefined && cambios.name !== null && estaVacio(cambios.slug)) {
    cambios.slug = slugify(cambios.name)
  }
  return repositorio.actualizar(id, cambios)
}

export async function eliminar(id) {
  return repositorio.eliminar(id)
}

export async function anadirImagen(idProducto, url, esPrincipal = false) {
  return repositorio.anadirImagen(idProducto, url, esPrincipal)
}

export async function quitarImagen(idImagen) {
  return repositorio.quitarImagen(idImagen)
}

export async function anadirVariante(idProducto, variante = {}) {
  return repositorio.anadirVariante(
    idProducto,
    variante.size ?? 'Única',
    variante.color ?? 'Estándar',
    variante.sku ?? null,
    variante.stock ?? 0
  )
}

export async function actualizarStockVariante(idVariante, stock) {
  return repositorio.actualizarStockVariante(idVariante, stock)
}

export async function eliminarVariante(idVariante) {
  return repositorio.eliminarVariante(idVariante)
}
