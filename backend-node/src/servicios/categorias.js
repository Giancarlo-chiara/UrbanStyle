import * as repositorio from '../repositorios/categorias.js'
import { ErrorDeNegocio } from '../utils/respuesta.js'
import slugificar from '../utils/slug.js'

/**
 * Reglas de negocio de las categorías.
 */

/**
 * Un id que no es un entero positivo no puede corresponder a ninguna fila, así
 * que se trata igual que un id inexistente. Se comprueba aquí porque `BigInt('x')`
 * lanza un SyntaxError que acabaría como 500.
 */
function normalizarId(id) {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function exigirExistente(id) {
  const numero = normalizarId(id)
  if (numero === null) throw new ErrorDeNegocio('Categoría no encontrada.', 404)

  const categoria = await repositorio.buscarPorId(numero)
  if (!categoria) throw new ErrorDeNegocio('Categoría no encontrada.', 404)

  return numero
}

export async function listar(soloActivos = true) {
  return repositorio.buscarTodas(soloActivos)
}

/** Un slug que llega vacío o en blanco cuenta como no enviado. */
const slugEnviado = (datos) => (typeof datos.slug === 'string' && datos.slug.trim()
  ? datos.slug.trim()
  : null)

export async function crear(datos) {
  const slug = slugEnviado(datos) ?? slugificar(datos.name)
  const creada = await repositorio.crear({ ...datos, slug })
  return { id: creada.id }
}

/**
 * El slug se regenera a partir del nombre salvo que el cliente mande uno propio.
 * El panel nunca lo manda: es el servidor quien lo decide.
 */
export async function actualizar(id, datos) {
  const numero = await exigirExistente(id)

  const cambios = { ...datos }
  const propio = slugEnviado(datos)

  if (propio) {
    cambios.slug = propio
  } else {
    // Nunca se escribe un slug en blanco: o se recalcula desde el nombre, o se
    // deja el que ya tenía la fila.
    delete cambios.slug
    if (datos.name !== undefined) cambios.slug = slugificar(datos.name)
  }

  await repositorio.actualizar(numero, cambios)
}

export async function eliminar(id) {
  const numero = await exigirExistente(id)
  await repositorio.eliminar(numero)
}
