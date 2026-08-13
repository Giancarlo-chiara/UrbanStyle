import prisma from '../config/prisma.js'

/** Acceso a datos de la tabla `promotions`. */

export async function listar() {
  return prisma.promotions.findMany({ orderBy: { created_at: 'desc' } })
}

export async function buscarPorId(id) {
  return prisma.promotions.findUnique({ where: { id: BigInt(id) } })
}

/** Búsqueda por código sin condiciones de vigencia; sirve para detectar choques. */
export async function buscarPorCodigo(code) {
  return prisma.promotions.findUnique({ where: { code } })
}

/**
 * Devuelve el cupón solo si está activo Y hoy cae dentro de su vigencia. Un
 * extremo nulo significa "sin límite por ese lado", así que no restringe.
 *
 * La usa el dominio de pedidos para valorar `promotion_code`. La comparación del
 * código es exacta, como en la versión en PHP; los códigos se guardan siempre en
 * mayúsculas.
 *
 * @param {string} code
 */
export async function buscarActivaPorCodigo(code) {
  const ahora = new Date()

  return prisma.promotions.findFirst({
    where: {
      code,
      active: true,
      AND: [
        { OR: [{ starts_at: null }, { starts_at: { lte: ahora } }] },
        { OR: [{ ends_at: null }, { ends_at: { gte: ahora } }] },
      ],
    },
  })
}

export async function crear(columnas) {
  return prisma.promotions.create({ data: columnas })
}

export async function actualizar(id, columnas) {
  return prisma.promotions.update({ where: { id: BigInt(id) }, data: columnas })
}

export async function eliminar(id) {
  await prisma.promotions.delete({ where: { id: BigInt(id) } })
  return true
}

export default {
  listar,
  buscarPorId,
  buscarPorCodigo,
  buscarActivaPorCodigo,
  crear,
  actualizar,
  eliminar,
}
