import prisma from '../config/prisma.js'

/**
 * Acceso a datos de la bitácora de inventario.
 *
 * Las funciones que escriben aceptan un `cliente` para poder ejecutarse dentro de
 * un `$transaction`: el servicio les pasa el `tx` y así el INSERT del movimiento y
 * el UPDATE del stock viven o mueren juntos, igual que hacía el beginTransaction
 * del repositorio en PHP.
 */

/**
 * Últimos 200 movimientos, ya aplanados: nombre del producto, talla, color,
 * stock que tiene AHORA la variante y quién registró el movimiento.
 *
 * Va en SQL crudo por los tres JOIN (uno LEFT, porque `created_by` es opcional y
 * un usuario borrado no debe hacer desaparecer el movimiento de la auditoría) y
 * porque el frontend lee estos alias exactos: `product_name`, `current_stock`.
 */
export function listarMovimientos() {
  return prisma.$queryRaw`
    SELECT im.id, im.type, im.quantity, im.reason, im.created_at,
           pv.size, pv.color, pv.sku, pv.stock AS current_stock,
           p.name AS product_name, p.id AS product_id,
           u.full_name AS created_by_name
    FROM inventory_movements im
    JOIN product_variants pv ON pv.id = im.variant_id
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN users u ON u.id = im.created_by
    ORDER BY im.created_at DESC
    LIMIT 200`
}

/** Variantes cuyo stock está en el umbral o por debajo, las más críticas primero. */
export function listarBajoStock(umbral) {
  return prisma.$queryRaw`
    SELECT pv.id AS variant_id, pv.size, pv.color, pv.stock,
           p.id AS product_id, p.name AS product_name
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.stock <= ${umbral}
    ORDER BY pv.stock ASC`
}

export function buscarVariante(varianteId, cliente = prisma) {
  return cliente.product_variants.findUnique({ where: { id: BigInt(varianteId) } })
}

export function crearMovimiento(
  { varianteId, tipo, cantidad, motivo = null, registradoPor = null },
  cliente = prisma
) {
  return cliente.inventory_movements.create({
    data: {
      variant_id: BigInt(varianteId),
      type: tipo,
      quantity: cantidad,
      reason: motivo,
      created_by: registradoPor == null ? null : BigInt(registradoPor),
    },
  })
}

export function sumarStock(varianteId, cantidad, cliente = prisma) {
  return cliente.product_variants.update({
    where: { id: BigInt(varianteId) },
    data: { stock: { increment: cantidad } },
  })
}

export function fijarStock(varianteId, stock, cliente = prisma) {
  return cliente.product_variants.update({
    where: { id: BigInt(varianteId) },
    data: { stock },
  })
}

/**
 * Resta del stock SOLO si alcanza, y devuelve cuántas filas cambió (0 o 1).
 *
 * La condición `stock >= cantidad` viaja dentro del propio UPDATE a propósito: si
 * se comprobara antes con un SELECT, dos salidas simultáneas de la misma variante
 * podrían pasar las dos y dejar el stock en negativo.
 */
export async function restarStockSiAlcanza(varianteId, cantidad, cliente = prisma) {
  const { count } = await cliente.product_variants.updateMany({
    where: { id: BigInt(varianteId), stock: { gte: cantidad } },
    data: { stock: { decrement: cantidad } },
  })
  return count
}
