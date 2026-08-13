import { Prisma } from '@prisma/client'
import prisma from '../config/prisma.js'
import { ErrorDeNegocio } from '../utils/respuesta.js'

/**
 * Acceso a datos de productos. Traducción de `App\Repositories\ProductRepository`.
 *
 * El listado se resuelve con SQL crudo a propósito: `image` y `stock` son
 * subconsultas correlacionadas y el WHERE es dinámico, así que replicarlo con la
 * API de Prisma obligaría a varias consultas extra y a recomponer el resultado
 * a mano. Con `Prisma.sql` los valores siguen viajando parametrizados.
 */

// ---------------------------------------------------------------------------
// Ayudantes de conversión
// ---------------------------------------------------------------------------

/** Convierte a BigInt (todos los ids de este esquema lo son) o null si no es entero. */
function aId(valor) {
  if (typeof valor === 'bigint') return valor
  const numero = Number(valor)
  if (!Number.isInteger(numero)) return null
  return BigInt(numero)
}

/** Igual que `aId`, pero un id inválido es un 422 en lugar de reventar en PostgreSQL. */
function aIdObligatorio(valor, campo) {
  const id = aId(valor)
  if (id === null) {
    throw new ErrorDeNegocio(`El campo ${campo} no es un identificador válido.`, 422)
  }
  return id
}

/** Los ids opcionales aceptan vacío como NULL, no como 0. */
function aIdOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null
  return aIdObligatorio(valor, campo)
}

/**
 * Equivalente de `empty()` de PHP, del que dependen TODOS los filtros del
 * listado: con `!empty()`, un `minPrice=0` o un `featured=0` no filtran nada.
 */
function vacio(valor) {
  if (valor === undefined || valor === null || valor === false) return true
  if (Array.isArray(valor)) return valor.length === 0
  if (typeof valor === 'object') return Object.keys(valor).length === 0
  const texto = String(valor)
  return texto === '' || texto === '0'
}

/**
 * Filtro de texto. Si llega repetido en la query (`?size=M&size=L`, que Express
 * entrega como array) se toma el último valor; en PHP eso reventaba con un 500
 * al intentar enlazar un array como parámetro.
 */
function textoFiltro(valor) {
  if (vacio(valor)) return null
  const bruto = Array.isArray(valor) ? valor[valor.length - 1] : valor
  return typeof bruto === 'object' ? null : String(bruto)
}

/** Filtro numérico. Un valor no numérico se ignora en vez de romper la consulta. */
function numeroFiltro(valor) {
  const texto = textoFiltro(valor)
  if (texto === null) return null
  const numero = Number(texto)
  return Number.isFinite(numero) ? numero : null
}

/** Réplica del cast `(int)` de PHP: 'abc' -> 0, '50abc' -> 50. */
function aEntero(valor, porDefecto = 0) {
  if (valor === undefined || valor === null) return porDefecto
  const bruto = Array.isArray(valor) ? valor[valor.length - 1] : valor
  const numero = Number.parseInt(bruto, 10)
  return Number.isNaN(numero) ? 0 : numero
}

/** La columna es BOOLEAN; PHP enlazaba (int), así que 'true' contaba como false. */
function aBooleano(valor) {
  if (typeof valor === 'boolean') return valor
  if (typeof valor === 'number') return valor !== 0
  if (typeof valor === 'string') return aEntero(valor) !== 0
  return Boolean(valor)
}

/** Prisma acepta número o cadena numérica para Decimal; el vacío usa el defecto. */
function aDecimal(valor, porDefecto) {
  if (valor === undefined || valor === null || valor === '') return porDefecto
  return valor
}

/**
 * Acotado del tamaño de página. Sin esto, `?limit=-1` devolvía un 500 de
 * PostgreSQL y `?limit=1000000` volcaba el catálogo entero de una vez.
 * Se exporta porque el servicio necesita EL MISMO valor para la paginación.
 */
export function acotarLimite(valor) {
  return Math.min(100, Math.max(1, aEntero(valor, 24)))
}

export function acotarPagina(valor) {
  return Math.max(1, aEntero(valor, 1))
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

/** Lista blanca de ordenaciones: el valor recibido NUNCA se interpola. */
const ORDENES = {
  price_desc: 'p.final_price DESC',
  price_asc: 'p.final_price ASC',
  top_rated: 'p.rating_avg DESC',
  best_selling: 'p.rating_count DESC',
}
const ORDEN_POR_DEFECTO = 'p.created_at DESC'

function ordenacion(filtros) {
  const clave = textoFiltro(filtros.sort) ?? ''
  // hasOwn y no un acceso directo: `?sort=constructor` devolvería una función.
  return Prisma.raw(Object.hasOwn(ORDENES, clave) ? ORDENES[clave] : ORDEN_POR_DEFECTO)
}

/**
 * @param {boolean} incluirInactivos Solo lo activa el panel admin. NO se lee de
 *                                   la query string, para que la tienda no pueda
 *                                   pedir productos ocultos.
 */
function condiciones(filtros = {}, incluirInactivos = false) {
  const partes = [Prisma.sql`1 = 1`]

  if (!incluirInactivos) partes.push(Prisma.sql`p.status != 'inactivo'`)

  const categoria = textoFiltro(filtros.category)
  if (categoria !== null) partes.push(Prisma.sql`c.slug = ${categoria}`)

  const marca = textoFiltro(filtros.brand)
  if (marca !== null) partes.push(Prisma.sql`b.slug = ${marca}`)

  const talla = textoFiltro(filtros.size)
  if (talla !== null) {
    partes.push(Prisma.sql`EXISTS (
      SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size = ${talla}
    )`)
  }

  const precioMinimo = numeroFiltro(filtros.minPrice)
  if (precioMinimo !== null) partes.push(Prisma.sql`p.final_price >= ${precioMinimo}`)

  const precioMaximo = numeroFiltro(filtros.maxPrice)
  if (precioMaximo !== null) partes.push(Prisma.sql`p.final_price <= ${precioMaximo}`)

  const busqueda = textoFiltro(filtros.search)
  if (busqueda !== null) {
    const patron = `%${busqueda}%`
    partes.push(Prisma.sql`(p.name ILIKE ${patron} OR b.name ILIKE ${patron})`)
  }

  if (!vacio(filtros.featured)) partes.push(Prisma.sql`p.is_featured = TRUE`)
  if (!vacio(filtros.isNew)) partes.push(Prisma.sql`p.created_at >= NOW() - INTERVAL '30 days'`)
  if (!vacio(filtros.onSale)) partes.push(Prisma.sql`p.discount_percent > 0`)

  return Prisma.join(partes, ' AND ')
}

export async function buscarTodos(filtros = {}, incluirInactivos = false) {
  const limite = acotarLimite(filtros.limit)
  const desplazamiento = (acotarPagina(filtros.page) - 1) * limite

  // category_id / subcategory_id / brand_id viajan en el SELECT porque el
  // formulario de edición del panel los necesita para preseleccionar sus <select>.
  return prisma.$queryRaw`
    SELECT p.id, p.name, p.slug, p.description, p.price, p.discount_percent, p.final_price,
           p.status, p.is_featured, p.rating_avg, p.rating_count, p.created_at,
           p.category_id, p.subcategory_id, p.brand_id,
           c.name AS category, c.slug AS category_slug,
           b.name AS brand, b.slug AS brand_slug,
           (SELECT url FROM product_images pi WHERE pi.product_id = p.id
             ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS image,
           (SELECT COALESCE(SUM(stock), 0) FROM product_variants pv WHERE pv.product_id = p.id)::int AS stock
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN brands b ON b.id = p.brand_id
    WHERE ${condiciones(filtros, incluirInactivos)}
    ORDER BY ${ordenacion(filtros)}
    ${Prisma.raw(`LIMIT ${limite} OFFSET ${desplazamiento}`)}
  `
}

export async function contarTodos(filtros = {}, incluirInactivos = false) {
  const filas = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN brands b ON b.id = p.brand_id
    WHERE ${condiciones(filtros, incluirInactivos)}
  `
  return filas[0]?.total ?? 0
}

/**
 * Tallas realmente existentes en el catálogo visible, para que el filtro del
 * sidebar no lleve una lista fija en el frontend.
 */
export async function buscarTallas() {
  const filas = await prisma.$queryRaw`
    SELECT DISTINCT pv.size
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE p.status != 'inactivo'
    ORDER BY pv.size ASC
  `
  return filas.map((fila) => fila.size)
}

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------

/**
 * Producto completo con imágenes y variantes. NO filtra por estado: el panel
 * admin necesita ver los inactivos y el filtro público se aplica arriba.
 * @returns producto con .images[] y .variants[], o null
 */
export async function buscarPorId(id) {
  const idProducto = aId(id)
  if (idProducto === null) return null

  const filas = await prisma.$queryRaw`
    SELECT p.*, c.name AS category, c.slug AS category_slug,
           b.name AS brand, b.slug AS brand_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN brands b ON b.id = p.brand_id
    WHERE p.id = ${idProducto}
  `
  const producto = filas[0]
  if (!producto) return null

  producto.images = await obtenerImagenes(idProducto)
  producto.variants = await obtenerVariantes(idProducto)
  return producto
}

export async function obtenerImagenes(idProducto) {
  const id = aId(idProducto)
  if (id === null) return []
  return prisma.$queryRaw`
    SELECT id, url, is_primary, sort_order
    FROM product_images
    WHERE product_id = ${id}
    ORDER BY is_primary DESC, sort_order ASC
  `
}

export async function obtenerVariantes(idProducto) {
  const id = aId(idProducto)
  if (id === null) return []
  return prisma.$queryRaw`
    SELECT id, size, color, sku, stock
    FROM product_variants
    WHERE product_id = ${id}
    ORDER BY id ASC
  `
}

/** @returns variante (incluye product_id, stock, size), o null */
export async function buscarVariantePorId(idVariante) {
  const id = aId(idVariante)
  if (id === null) return null
  return prisma.product_variants.findUnique({ where: { id } })
}

export async function buscarRelacionados(idProducto, idCategoria, limite = 4) {
  const id = aId(idProducto)
  const idCat = aId(idCategoria)
  if (id === null || idCat === null) return []
  const tope = Math.max(1, aEntero(limite, 4))

  return prisma.$queryRaw`
    SELECT p.id, p.name, p.slug, p.price, p.discount_percent, p.final_price,
           p.rating_avg, p.rating_count, p.created_at,
           b.name AS brand, c.name AS category,
           (SELECT url FROM product_images pi WHERE pi.product_id = p.id
             ORDER BY is_primary DESC LIMIT 1) AS image,
           (SELECT COALESCE(SUM(stock), 0) FROM product_variants pv WHERE pv.product_id = p.id)::int AS stock
    FROM products p
    JOIN brands b ON b.id = p.brand_id
    JOIN categories c ON c.id = p.category_id
    WHERE p.category_id = ${idCat} AND p.id != ${id} AND p.status = 'activo'
    ORDER BY RANDOM()
    ${Prisma.raw(`LIMIT ${tope}`)}
  `
}

// ---------------------------------------------------------------------------
// CRUD administrativo
// ---------------------------------------------------------------------------

/**
 * `final_price` NO aparece en ningún create/update: es una columna GENERATED
 * ALWAYS de PostgreSQL y escribirla aborta la sentencia con el error 428C9.
 */
const CAMPOS_ACTUALIZABLES = [
  'category_id',
  'subcategory_id',
  'brand_id',
  'name',
  'slug',
  'description',
  'price',
  'discount_percent',
  'status',
  'is_featured',
]

export async function crear(datos) {
  const producto = await prisma.products.create({
    data: {
      category_id: aIdObligatorio(datos.category_id, 'category_id'),
      subcategory_id: aIdOpcional(datos.subcategory_id, 'subcategory_id'),
      brand_id: aIdObligatorio(datos.brand_id, 'brand_id'),
      name: datos.name,
      slug: datos.slug,
      description: datos.description ?? null,
      price: aDecimal(datos.price, 0),
      discount_percent: aDecimal(datos.discount_percent, 0),
      status: datos.status ?? 'activo',
      is_featured: aBooleano(datos.is_featured),
    },
    select: { id: true },
  })
  return Number(producto.id)
}

export async function actualizar(id, datos = {}) {
  const idProducto = aId(id)
  if (idProducto === null) return false

  const cambios = {}
  for (const campo of CAMPOS_ACTUALIZABLES) {
    if (!Object.hasOwn(datos, campo)) continue

    if (campo === 'category_id' || campo === 'brand_id') {
      cambios[campo] = aIdObligatorio(datos[campo], campo)
    } else if (campo === 'subcategory_id') {
      cambios[campo] = aIdOpcional(datos[campo], campo)
    } else if (campo === 'is_featured') {
      cambios[campo] = aBooleano(datos[campo])
    } else if (campo === 'price' || campo === 'discount_percent') {
      cambios[campo] = aDecimal(datos[campo], 0)
    } else {
      cambios[campo] = datos[campo]
    }
  }
  if (Object.keys(cambios).length === 0) return false

  // updateMany y no update: sobre un id inexistente devuelve 0 en lugar de
  // lanzar P2025, que el manejador central traduciría a un 404 que la API en
  // PHP no daba (allí un UPDATE sin filas seguía respondiendo 200).
  const resultado = await prisma.products.updateMany({ where: { id: idProducto }, data: cambios })
  return resultado.count > 0
}

export async function eliminar(id) {
  const idProducto = aId(id)
  if (idProducto === null) return false
  const resultado = await prisma.products.deleteMany({ where: { id: idProducto } })
  return resultado.count > 0
}

export async function anadirImagen(idProducto, url, esPrincipal = false, orden = 0) {
  const imagen = await prisma.product_images.create({
    data: {
      product_id: aIdObligatorio(idProducto, 'product_id'),
      url,
      is_primary: aBooleano(esPrincipal),
      sort_order: aEntero(orden, 0),
    },
    select: { id: true },
  })
  return Number(imagen.id)
}

export async function quitarImagen(idImagen) {
  const id = aId(idImagen)
  if (id === null) return false
  const resultado = await prisma.product_images.deleteMany({ where: { id } })
  return resultado.count > 0
}

export async function anadirVariante(idProducto, talla, color, sku, stock) {
  const variante = await prisma.product_variants.create({
    data: {
      product_id: aIdObligatorio(idProducto, 'product_id'),
      size: talla,
      color,
      sku: sku ?? null,
      stock: aEntero(stock, 0),
    },
    select: { id: true },
  })
  return Number(variante.id)
}

export async function actualizarStockVariante(idVariante, stock) {
  const id = aId(idVariante)
  if (id === null) return false
  const resultado = await prisma.product_variants.updateMany({
    where: { id },
    data: { stock: aEntero(stock, 0) },
  })
  return resultado.count > 0
}

export async function eliminarVariante(idVariante) {
  const id = aId(idVariante)
  if (id === null) return false
  const resultado = await prisma.product_variants.deleteMany({ where: { id } })
  return resultado.count > 0
}
