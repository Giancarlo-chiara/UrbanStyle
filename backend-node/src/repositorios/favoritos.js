import prisma from '../config/prisma.js'

/**
 * Acceso a datos de la tabla `favorites` (clave primaria compuesta
 * user_id + product_id, sin columna `id` propia).
 */

/**
 * Devuelve los PRODUCTOS marcados por el usuario, no las filas de `favorites`:
 * el frontend reutiliza la misma tarjeta del catálogo, así que necesita las
 * mismas columnas (marca, categoría, imagen principal y stock agregado).
 *
 * Se resuelve con SQL en una sola consulta —igual que hacía la versión en PHP—
 * porque la imagen y el stock son subconsultas correlacionadas: con el API de
 * Prisma harían falta dos `include` y un recuento en JavaScript.
 *
 * @param {number} usuarioId
 */
export async function listarPorUsuario(usuarioId) {
  return prisma.$queryRaw`
    SELECT p.id, p.name, p.slug, p.price, p.discount_percent, p.final_price,
           p.rating_avg, p.rating_count, p.created_at,
           b.name AS brand,
           c.name AS category,
           (SELECT pi.url
              FROM product_images pi
             WHERE pi.product_id = p.id
             ORDER BY pi.is_primary DESC, pi.sort_order ASC
             LIMIT 1) AS image,
           (SELECT COALESCE(SUM(pv.stock), 0)::int
              FROM product_variants pv
             WHERE pv.product_id = p.id) AS stock
      FROM favorites f
      JOIN products p ON p.id = f.product_id
      JOIN brands b ON b.id = p.brand_id
      JOIN categories c ON c.id = p.category_id
     WHERE f.user_id = ${BigInt(usuarioId)}
     ORDER BY f.created_at DESC`
}

/**
 * Inserta el favorito ignorando el duplicado, para que marcar dos veces el mismo
 * producto no devuelva un error. `skipDuplicates` se traduce exactamente al
 * `ON CONFLICT DO NOTHING` que usaba el SQL original.
 *
 * @returns {Promise<boolean>} true si la fila era nueva
 */
export async function agregar(usuarioId, productoId) {
  const { count } = await prisma.favorites.createMany({
    data: [{ user_id: BigInt(usuarioId), product_id: BigInt(productoId) }],
    skipDuplicates: true,
  })
  return count > 0
}

/** @returns {Promise<boolean>} true si había algo que borrar */
export async function eliminar(usuarioId, productoId) {
  const { count } = await prisma.favorites.deleteMany({
    where: { user_id: BigInt(usuarioId), product_id: BigInt(productoId) },
  })
  return count > 0
}

/**
 * Comprobación de existencia previa al INSERT. Vive aquí, y no se pide al
 * dominio de productos, porque solo interesa la clave ajena: `count` no trae
 * ninguna columna, mientras que `productos.buscarPorId` cargaría el producto
 * completo con sus imágenes y variantes.
 */
export async function existeProducto(productoId) {
  const total = await prisma.products.count({ where: { id: BigInt(productoId) } })
  return total > 0
}

export default { listarPorUsuario, agregar, eliminar, existeProducto }
