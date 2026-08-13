import prisma from '../config/prisma.js'
import { ErrorDeNegocio } from '../utils/respuesta.js'

/**
 * Acceso a datos de pedidos.
 *
 * Todos los identificadores se normalizan aquí con `BigInt(...)`: las columnas
 * son BIGINT y Prisma no acepta un número de JavaScript en su lugar. Así el
 * servicio puede pasar indistintamente el BigInt que le llegó de otro
 * repositorio o el número que sacó de la URL.
 */

/**
 * Crea el pedido, sus líneas, el descuento de stock y la primera entrada de la
 * bitácora de estados, todo dentro de una única transacción.
 *
 * @param {object} pedido  cabecera ya calculada por el servicio
 * @param {Array<object>} lineas  { product_id, variant_id, nombre, unit_price, quantity, subtotal }
 * @returns {Promise<bigint>} id del pedido creado
 */
export async function crear(pedido, lineas) {
  return prisma.$transaction(
    async (tx) => {
      const orden = await tx.orders.create({
        data: {
          user_id: BigInt(pedido.user_id),
          address_id: pedido.address_id == null ? null : BigInt(pedido.address_id),
          subtotal: importe(pedido.subtotal),
          discount_total: importe(pedido.discount_total),
          shipping_cost: importe(pedido.shipping_cost),
          total: importe(pedido.total),
          payment_method: pedido.payment_method,
          promotion_code: pedido.promotion_code ?? null,
          status: 'pendiente',
        },
        select: { id: true },
      })

      for (const linea of lineas) {
        await tx.order_items.create({
          data: {
            order_id: orden.id,
            product_id: BigInt(linea.product_id),
            variant_id: linea.variant_id == null ? null : BigInt(linea.variant_id),
            product_name_snapshot: linea.nombre,
            unit_price: importe(linea.unit_price),
            quantity: linea.quantity,
            subtotal: importe(linea.subtotal),
          },
        })

        if (linea.variant_id == null) continue

        /*
         * El descuento de stock va en SQL crudo por dos motivos que Prisma no
         * cubre con `update`:
         *
         *   - `stock = stock - qty` se resuelve en el servidor, sin leer antes el
         *     valor, así que dos compras simultáneas no se pisan.
         *   - la guarda `AND stock >= qty` deja la comprobación en manos de
         *     PostgreSQL, que bloquea la fila y REEVALÚA la condición si otra
         *     transacción la modificó mientras esperaba.
         *
         * `$executeRaw` devuelve el número de filas afectadas, que es la única
         * señal de que la carrera se perdió.
         */
        const filas = await tx.$executeRaw`
          UPDATE product_variants
             SET stock = stock - ${linea.quantity}::int
           WHERE id = ${BigInt(linea.variant_id)}::bigint
             AND stock >= ${linea.quantity}::int`

        if (filas === 0) {
          // Sin esto el pedido se confirmaba igual y el stock quedaba corto:
          // sobreventa silenciosa. La excepción revierte toda la transacción.
          // La regla es de negocio, pero solo puede comprobarse aquí dentro:
          // fuera de la transacción la respuesta ya no significa nada.
          throw new ErrorDeNegocio(
            `El stock de "${linea.nombre}" se agotó mientras confirmábamos tu pedido.`
          )
        }
      }

      await tx.order_status_history.create({
        data: { order_id: orden.id, status: 'pendiente', note: 'Pedido creado' },
      })

      return orden.id
    },
    // Una compra hace 2 consultas por línea más 2 de cabecera. Con 20 líneas y
    // una base que despierta en frío, los 5 s por defecto de Prisma se quedan
    // cortos y la transacción se abortaría a mitad.
    { maxWait: 5000, timeout: 15000 }
  )
}

export async function buscarPorUsuario(usuarioId) {
  return prisma.orders.findMany({
    where: { user_id: BigInt(usuarioId) },
    select: {
      id: true,
      subtotal: true,
      discount_total: true,
      shipping_cost: true,
      total: true,
      status: true,
      payment_method: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  })
}

/** Pedido completo con sus líneas, o null. */
export async function buscarPorId(id) {
  const orden = await prisma.orders.findUnique({ where: { id: BigInt(id) } })
  if (!orden) return null

  const items = await prisma.order_items.findMany({
    where: { order_id: orden.id },
    orderBy: { id: 'asc' },
  })

  return { ...orden, items }
}

// ---------------- Administración ----------------

export async function buscarTodos() {
  const ordenes = await prisma.orders.findMany({
    select: {
      id: true,
      total: true,
      status: true,
      created_at: true,
      users: { select: { full_name: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  return ordenes.map(({ users, ...orden }) => ({
    ...orden,
    customer_name: users.full_name,
    customer_email: users.email,
  }))
}

/**
 * Detalle para el panel: la cabecera, las líneas, quién compró y a dónde va.
 *
 * La versión en PHP hacía `SELECT * FROM orders`, así que el panel mostraba un
 * pedido sin poder decir de quién era ni a qué dirección se enviaba.
 */
export async function buscarDetalleAdmin(id) {
  const orden = await prisma.orders.findUnique({
    where: { id: BigInt(id) },
    include: {
      users: { select: { id: true, full_name: true, email: true, phone: true } },
      addresses: true,
      order_items: { orderBy: { id: 'asc' } },
    },
  })
  if (!orden) return null

  const { users, addresses, order_items: lineas, ...cabecera } = orden

  return {
    ...cabecera,
    customer_name: users.full_name,
    customer_email: users.email,
    customer_phone: users.phone,
    // null cuando el pedido se hizo sin dirección asociada, que el esquema permite.
    address: addresses,
    items: lineas,
  }
}

/**
 * Cambia el estado y lo anota en la bitácora, en una sola transacción.
 * @returns {Promise<boolean>} false si el pedido no existe
 */
export async function actualizarEstado(id, status, note = null) {
  return prisma.$transaction(async (tx) => {
    const existe = await tx.orders.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })
    // En PHP el UPDATE afectaba 0 filas sin avisar y el INSERT en la bitácora
    // reventaba después contra la clave ajena, devolviendo un 500 opaco.
    if (!existe) return false

    await tx.orders.update({ where: { id: existe.id }, data: { status } })
    await tx.order_status_history.create({
      data: { order_id: existe.id, status, note: note ?? null },
    })

    return true
  })
}

/**
 * Los importes viajan como cadena de dos decimales: es lo que espera una columna
 * NUMERIC(10,2) y evita que la representación binaria de un float meta un
 * decimal de más antes de llegar a PostgreSQL.
 */
function importe(valor) {
  return Number(valor).toFixed(2)
}

export default {
  crear,
  buscarPorUsuario,
  buscarPorId,
  buscarTodos,
  buscarDetalleAdmin,
  actualizarEstado,
}
