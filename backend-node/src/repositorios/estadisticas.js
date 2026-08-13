import prisma from '../config/prisma.js'

/**
 * Métricas del panel, calculadas con agregados en SQL.
 *
 * Antes no existía este endpoint y el panel se fabricaba las cifras en el
 * navegador: descargaba la tabla ENTERA de pedidos y la de usuarios solo para
 * hacerles `.length`. Con volumen real eso es la petición más cara del panel y,
 * de paso, enviaba al cliente el nombre y el correo de todos los compradores
 * para acabar mostrando un número.
 */

const UMBRAL_STOCK_BAJO = 5

export async function resumen(umbral = UMBRAL_STOCK_BAJO) {
  const [productos, pedidos, dinero, usuarios, inventario] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE status = 'activo')   AS activos,
        COUNT(*) FILTER (WHERE status = 'agotado')  AS agotados,
        COUNT(*) FILTER (WHERE status = 'inactivo') AS inactivos,
        COUNT(*)                                    AS total
      FROM products`,

    prisma.$queryRaw`
      SELECT status, COUNT(*) AS cantidad
      FROM orders
      GROUP BY status
      ORDER BY COUNT(*) DESC`,

    // Los pedidos cancelados no cuentan como ingreso.
    prisma.$queryRaw`
      SELECT
        COUNT(*)                        AS pedidos_validos,
        COALESCE(SUM(total), 0)         AS ingresos,
        COALESCE(AVG(total), 0)         AS ticket_promedio,
        COALESCE(SUM(discount_total),0) AS descuentos
      FROM orders
      WHERE status <> 'cancelado'`,

    prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE r.name = 'cliente') AS clientes,
        COUNT(*) FILTER (WHERE r.name = 'admin')   AS admins,
        COUNT(*) FILTER (WHERE u.status = 'activo') AS activos
      FROM users u JOIN roles r ON r.id = u.role_id`,

    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(stock), 0)                AS unidades,
        COUNT(*)                               AS variantes,
        COUNT(*) FILTER (WHERE stock = 0)      AS agotadas,
        COUNT(*) FILTER (WHERE stock > 0 AND stock <= ${umbral}) AS criticas
      FROM product_variants`,
  ])

  return {
    productos: productos[0],
    pedidosPorEstado: pedidos,
    dinero: dinero[0],
    usuarios: usuarios[0],
    inventario: inventario[0],
  }
}

/** Los que más unidades han salido, según las líneas de pedido reales. */
export async function masVendidos(limite = 5) {
  return prisma.$queryRaw`
    SELECT
      oi.product_id,
      oi.product_name_snapshot AS nombre,
      SUM(oi.quantity)::int    AS unidades,
      SUM(oi.subtotal)         AS ingresos
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status <> 'cancelado'
    GROUP BY oi.product_id, oi.product_name_snapshot
    ORDER BY SUM(oi.quantity) DESC
    LIMIT ${limite}`
}

export async function ultimosPedidos(limite = 5) {
  return prisma.$queryRaw`
    SELECT o.id, o.total, o.status, o.created_at,
           u.full_name AS customer_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
    LIMIT ${limite}`
}

/** Variantes bajo el umbral, acotadas: el panel solo muestra las más urgentes. */
export async function stockCritico(umbral = UMBRAL_STOCK_BAJO, limite = 10) {
  return prisma.$queryRaw`
    SELECT pv.id AS variant_id, pv.size, pv.color, pv.stock,
           p.id AS product_id, p.name AS product_name
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.stock <= ${umbral} AND p.status <> 'inactivo'
    ORDER BY pv.stock ASC, p.name ASC
    LIMIT ${limite}`
}
