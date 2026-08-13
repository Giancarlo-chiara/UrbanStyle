import * as usuarios from '../repositorios/usuarios.js'
import { ErrorDeNegocio } from '../utils/respuesta.js'

const ROL_ADMIN = 1

const ERROR_TIENE_PEDIDOS = 'No se puede eliminar: el usuario tiene pedidos registrados.'

/** Lo único que un usuario puede cambiar de su propio perfil. */
const CAMPOS_DE_PERFIL = ['full_name', 'phone']

/**
 * Lista blanca estricta. Es lo que impide que un `PUT /users/profile` con
 * `{"role_id":1}` o `{"status":"activo"}` en el cuerpo se convierta en una
 * escalada de privilegios por asignación masiva.
 */
export async function actualizarPerfil(idUsuario, datos) {
  const permitidos = {}
  for (const campo of CAMPOS_DE_PERFIL) {
    if (Object.prototype.hasOwnProperty.call(datos ?? {}, campo)) {
      // Un teléfono vacío se guarda como NULL, que es lo que significa; el
      // frontend envía '' cuando la persona borra el campo.
      permitidos[campo] = campo === 'phone' && datos[campo] === '' ? null : datos[campo]
    }
  }

  if (Object.keys(permitidos).length === 0) {
    throw new ErrorDeNegocio('No se envió ningún campo modificable.', 422)
  }

  return usuarios.actualizarPerfil(idUsuario, permitidos)
}

// ---------------- Administración ----------------

export async function listar() {
  return usuarios.listarTodos()
}

export async function cambiarEstado(id, status, idAdministrador) {
  const usuario = await exigirUsuario(id)

  /*
   * Reglas de gobierno que la versión en PHP no tenía. Sin ellas, un
   * administrador podía dejarse a sí mismo inactivo o quitarse el rol y perder
   * el acceso al panel sin forma de recuperarlo desde la propia aplicación.
   */
  if (Number(usuario.id) === Number(idAdministrador)) {
    throw new ErrorDeNegocio('No puedes cambiar el estado de tu propia cuenta.', 409)
  }

  if (usuario.role === 'admin' && usuario.status === 'activo' && status !== 'activo') {
    await exigirQueNoSeaElUltimoAdmin('desactivar')
  }

  return usuarios.actualizarEstado(id, status)
}

export async function cambiarRol(id, roleId, idAdministrador) {
  const usuario = await exigirUsuario(id)

  if (Number(usuario.id) === Number(idAdministrador)) {
    throw new ErrorDeNegocio('No puedes cambiar tu propio rol.', 409)
  }

  if (usuario.role === 'admin' && usuario.status === 'activo' && Number(roleId) !== ROL_ADMIN) {
    await exigirQueNoSeaElUltimoAdmin('degradar')
  }

  return usuarios.actualizarRol(id, roleId)
}

export async function eliminar(id, idAdministrador) {
  const usuario = await exigirUsuario(id)

  if (Number(usuario.id) === Number(idAdministrador)) {
    throw new ErrorDeNegocio('No puedes eliminar tu propia cuenta.', 409)
  }

  if (usuario.role === 'admin' && usuario.status === 'activo') {
    await exigirQueNoSeaElUltimoAdmin('eliminar')
  }

  /*
   * `orders.user_id` es ON DELETE RESTRICT. Se comprueba ANTES en lugar de
   * confiar en capturar el fallo: medido contra la base real, Prisma NO clasifica
   * este error como P2003 —lo entrega como `PrismaClientUnknownRequestError` con
   * el código 23001 de PostgreSQL dentro del texto—, así que el manejador central
   * lo habría devuelto como 500. El `catch` de abajo queda solo como red de
   * seguridad para la carrera entre la comprobación y el borrado.
   */
  if ((await usuarios.contarPedidos(id)) > 0) {
    throw new ErrorDeNegocio(ERROR_TIENE_PEDIDOS, 409)
  }

  try {
    return await usuarios.eliminar(id)
  } catch (e) {
    if (e?.code === 'P2003' || /23001|RESTRICT/.test(e?.message ?? '')) {
      throw new ErrorDeNegocio(ERROR_TIENE_PEDIDOS, 409)
    }
    throw e
  }
}

async function exigirUsuario(id) {
  const usuario = await usuarios.buscarPorId(id)
  if (!usuario) {
    throw new ErrorDeNegocio('El usuario no existe.', 404)
  }
  return usuario
}

async function exigirQueNoSeaElUltimoAdmin(accion) {
  if ((await usuarios.contarAdministradoresActivos()) <= 1) {
    throw new ErrorDeNegocio(
      `No se puede ${accion} al último administrador activo del sistema.`,
      409
    )
  }
}

export default { actualizarPerfil, listar, cambiarEstado, cambiarRol, eliminar }
