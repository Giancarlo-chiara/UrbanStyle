import prisma from '../config/prisma.js'

/**
 * Acceso a datos de `brands`. Sin reglas de negocio.
 */

/** Los mismos cinco campos que seleccionaba el SELECT del listado en PHP. */
const CAMPOS_LISTA = {
  id: true,
  name: true,
  slug: true,
  logo_url: true,
  status: true,
}

const CAMPOS_EDITABLES = ['name', 'slug', 'logo_url', 'status']

const aBigInt = (valor) => BigInt(valor)

/**
 * @param {boolean} soloActivos La tienda solo muestra activas; el panel admin
 *                              necesita ver también las inactivas para reactivarlas.
 */
export async function buscarTodas(soloActivos = true) {
  return prisma.brands.findMany({
    where: soloActivos ? { status: 'activo' } : undefined,
    select: CAMPOS_LISTA,
    orderBy: { name: 'asc' },
  })
}

export async function buscarPorId(id) {
  return prisma.brands.findUnique({ where: { id: aBigInt(id) } })
}

export async function crear(datos) {
  // `status` se omite a propósito, como en el INSERT del PHP: lo pone el DEFAULT.
  return prisma.brands.create({
    data: {
      name: datos.name,
      slug: datos.slug,
      logo_url: datos.logo_url ?? null,
    },
    select: { id: true },
  })
}

export async function actualizar(id, datos) {
  const cambios = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (Object.hasOwn(datos, campo)) cambios[campo] = datos[campo]
  }

  if (Object.keys(cambios).length === 0) return null

  return prisma.brands.update({
    where: { id: aBigInt(id) },
    data: cambios,
    select: CAMPOS_LISTA,
  })
}

export async function eliminar(id) {
  return prisma.brands.delete({ where: { id: aBigInt(id) } })
}
