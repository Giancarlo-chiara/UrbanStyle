import * as repositorio from '../repositorios/marcas.js'
import { ErrorDeNegocio } from '../utils/respuesta.js'
import slugificar from '../utils/slug.js'

/**
 * Reglas de negocio de las marcas. Mismo comportamiento que las categorías: en
 * PHP eran dos servicios calcados salvo por el slug, que allí ignoraba los
 * acentos. Ahora los dos usan `utils/slug.js`.
 */

function normalizarId(id) {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function exigirExistente(id) {
  const numero = normalizarId(id)
  if (numero === null) throw new ErrorDeNegocio('Marca no encontrada.', 404)

  const marca = await repositorio.buscarPorId(numero)
  if (!marca) throw new ErrorDeNegocio('Marca no encontrada.', 404)

  return numero
}

const slugEnviado = (datos) => (typeof datos.slug === 'string' && datos.slug.trim()
  ? datos.slug.trim()
  : null)

export async function listar(soloActivos = true) {
  return repositorio.buscarTodas(soloActivos)
}

export async function crear(datos) {
  const slug = slugEnviado(datos) ?? slugificar(datos.name)
  const creada = await repositorio.crear({ ...datos, slug })
  return { id: creada.id }
}

export async function actualizar(id, datos) {
  const numero = await exigirExistente(id)

  const cambios = { ...datos }
  const propio = slugEnviado(datos)

  if (propio) {
    cambios.slug = propio
  } else {
    delete cambios.slug
    if (datos.name !== undefined) cambios.slug = slugificar(datos.name)
  }

  await repositorio.actualizar(numero, cambios)
}

export async function eliminar(id) {
  const numero = await exigirExistente(id)
  await repositorio.eliminar(numero)
}
