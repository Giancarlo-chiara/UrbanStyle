import prisma from '../config/prisma.js'

/**
 * Acceso a datos de usuarios.
 *
 * El JSON que ve el frontend lleva `role` como CADENA con el nombre del rol
 * ('admin' | 'cliente'), no el objeto de la relación ni el `role_id`. En PHP eso
 * salía del `JOIN roles r ... r.name AS role`; aquí se pide la relación y se
 * aplana, para que el contrato no cambie.
 *
 * `updated_at` no se toca nunca: lo mantiene el trigger `trg_users_updated_at`
 * de PostgreSQL.
 */

/** Columnas seguras: las mismas que devolvía `findById`, sin `password_hash`. */
const SELECCION_PUBLICA = {
  id: true,
  full_name: true,
  email: true,
  phone: true,
  status: true,
  created_at: true,
  roles: { select: { name: true } },
}

function aplanarRol(fila) {
  if (!fila) return null
  const { roles, ...resto } = fila
  return { ...resto, role: roles?.name ?? null }
}

/** Usuario CON `password_hash` y con `.role`. Solo para el login. */
export async function buscarPorEmail(email) {
  const fila = await prisma.users.findUnique({
    where: { email },
    include: { roles: { select: { name: true } } },
  })
  return aplanarRol(fila)
}

/** Usuario SIN `password_hash`, con `.role`. */
export async function buscarPorId(id) {
  const fila = await prisma.users.findUnique({
    where: { id: BigInt(id) },
    select: SELECCION_PUBLICA,
  })
  return aplanarRol(fila)
}

export async function crear({ full_name, email, password_hash, phone = null, role_id = 2 }) {
  const fila = await prisma.users.create({
    data: { role_id, full_name, email, password_hash, phone },
    select: SELECCION_PUBLICA,
  })
  return aplanarRol(fila)
}

/**
 * @param {Record<string, unknown>} datos Ya filtrado por el servicio: solo
 *   puede contener `full_name` y `phone`.
 */
export async function actualizarPerfil(id, datos) {
  const fila = await prisma.users.update({
    where: { id: BigInt(id) },
    data: datos,
    select: SELECCION_PUBLICA,
  })
  return aplanarRol(fila)
}

// ---------------- Administración ----------------

export async function listarTodos() {
  const filas = await prisma.users.findMany({
    select: SELECCION_PUBLICA,
    orderBy: { created_at: 'desc' },
  })
  return filas.map(aplanarRol)
}

export async function actualizarEstado(id, status) {
  const fila = await prisma.users.update({
    where: { id: BigInt(id) },
    data: { status },
    select: SELECCION_PUBLICA,
  })
  return aplanarRol(fila)
}

export async function actualizarRol(id, roleId) {
  const fila = await prisma.users.update({
    where: { id: BigInt(id) },
    data: { role_id: Number(roleId) },
    select: SELECCION_PUBLICA,
  })
  return aplanarRol(fila)
}

export async function eliminar(id) {
  await prisma.users.delete({ where: { id: BigInt(id) } })
  return true
}

/**
 * Pedidos del usuario. `orders.user_id` es ON DELETE RESTRICT, así que esto
 * decide si el borrado es posible ANTES de intentarlo.
 */
export async function contarPedidos(id) {
  return prisma.orders.count({ where: { user_id: BigInt(id) } })
}

/** Cuántos administradores ACTIVOS quedan. Sostiene las reglas de gobierno. */
export async function contarAdministradoresActivos() {
  return prisma.users.count({
    where: { status: 'activo', roles: { name: 'admin' } },
  })
}

export default {
  buscarPorEmail,
  buscarPorId,
  crear,
  actualizarPerfil,
  listarTodos,
  actualizarEstado,
  actualizarRol,
  eliminar,
  contarPedidos,
  contarAdministradoresActivos,
}
