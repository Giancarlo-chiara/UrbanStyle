import prisma from '../config/prisma.js'

/**
 * Acceso a datos de `categories`. Sin reglas de negocio.
 */

/** Los mismos seis campos que seleccionaba el SELECT del listado en PHP. */
const CAMPOS_LISTA = {
  id: true,
  parent_id: true,
  name: true,
  slug: true,
  icon: true,
  status: true,
}

/** Columnas que el cliente puede tocar en un update, en el mismo orden que el PHP. */
const CAMPOS_EDITABLES = ['parent_id', 'name', 'slug', 'icon', 'status']

/** Un id de PostgreSQL es BIGINT: hay que convertirlo o la consulta no casa. */
const aBigInt = (valor) => BigInt(valor)

/** `parent_id` viaja como número, cadena o null desde el JSON. */
function aBigIntOpcional(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  return BigInt(valor)
}

/**
 * @param {boolean} soloActivos La tienda solo muestra activas; el panel admin
 *                              necesita ver también las inactivas para reactivarlas.
 */
export async function buscarTodas(soloActivos = true) {
  return prisma.categories.findMany({
    where: soloActivos ? { status: 'activo' } : undefined,
    select: CAMPOS_LISTA,
    orderBy: { name: 'asc' },
  })
}

export async function buscarPorId(id) {
  return prisma.categories.findUnique({ where: { id: aBigInt(id) } })
}

export async function crear(datos) {
  // `status` se omite a propósito: el INSERT del PHP tampoco lo escribía, así que
  // una categoría nueva nace siempre 'activo' por el DEFAULT de la columna.
  return prisma.categories.create({
    data: {
      parent_id: aBigIntOpcional(datos.parent_id),
      name: datos.name,
      slug: datos.slug,
      icon: datos.icon ?? null,
    },
    select: { id: true },
  })
}

/**
 * Actualiza solo los campos presentes en `datos`, igual que el UPDATE dinámico
 * del PHP. Devuelve null si no había ninguno que tocar.
 */
export async function actualizar(id, datos) {
  const cambios = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (!Object.hasOwn(datos, campo)) continue
    cambios[campo] = campo === 'parent_id' ? aBigIntOpcional(datos[campo]) : datos[campo]
  }

  if (Object.keys(cambios).length === 0) return null

  return prisma.categories.update({
    where: { id: aBigInt(id) },
    data: cambios,
    select: CAMPOS_LISTA,
  })
}

export async function eliminar(id) {
  return prisma.categories.delete({ where: { id: aBigInt(id) } })
}
