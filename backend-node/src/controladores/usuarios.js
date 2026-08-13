import * as autenticacion from '../servicios/autenticacion.js'
import * as servicio from '../servicios/usuarios.js'
import { exito, error } from '../utils/respuesta.js'
import validar from '../utils/validador.js'

// ---------------- Perfil propio ----------------

export async function perfil(req, res, next) {
  try {
    return exito(res, await autenticacion.perfil(req.usuario.id))
  } catch (e) {
    return next(e)
  }
}

export async function actualizarPerfil(req, res, next) {
  /*
   * El PHP no validaba nada aquí: se podía dejar el nombre en blanco, y un
   * teléfono más largo que su VARCHAR(20) reventaba como 500 de PostgreSQL.
   */
  const errores = validar(req.body, {
    full_name: 'required|min:3|max:150',
    phone: 'max:20',
  })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  try {
    const usuario = await servicio.actualizarPerfil(req.usuario.id, req.body)
    return exito(res, usuario, 'Perfil actualizado.')
  } catch (e) {
    return next(e)
  }
}

// ---------------- Administración ----------------

export async function listar(req, res, next) {
  try {
    return exito(res, await servicio.listar())
  } catch (e) {
    return next(e)
  }
}

export async function cambiarEstado(req, res, next) {
  const id = leerId(req)
  if (id === null) return error(res, 'Datos inválidos.', 422, { id: ['El identificador debe ser un número entero.'] })

  // El PHP escribía el estado crudo: un 'activoo' dejaba al usuario sin poder
  // entrar nunca más, porque el login exige exactamente 'activo'.
  const errores = validar(req.body, { status: 'required|in:activo,inactivo,bloqueado' })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  try {
    await servicio.cambiarEstado(id, req.body.status, req.usuario.id)
    return exito(res, null, 'Estado del usuario actualizado.')
  } catch (e) {
    return next(e)
  }
}

export async function cambiarRol(req, res, next) {
  const id = leerId(req)
  if (id === null) return error(res, 'Datos inválidos.', 422, { id: ['El identificador debe ser un número entero.'] })

  const errores = validar(req.body, { role_id: 'required|in:1,2' })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  try {
    await servicio.cambiarRol(id, Number(req.body.role_id), req.usuario.id)
    return exito(res, null, 'Rol actualizado.')
  } catch (e) {
    return next(e)
  }
}

export async function eliminar(req, res, next) {
  const id = leerId(req)
  if (id === null) return error(res, 'Datos inválidos.', 422, { id: ['El identificador debe ser un número entero.'] })

  try {
    await servicio.eliminar(id, req.usuario.id)
    return exito(res, null, 'Usuario eliminado.')
  } catch (e) {
    return next(e)
  }
}

/**
 * Los ids son BIGINT y Prisma exige BigInt exacto. Se comprueba antes de
 * convertir porque `BigInt('abc')` lanza un SyntaxError que saldría como 500.
 */
function leerId(req) {
  const bruto = req.params.id
  return /^\d+$/.test(String(bruto ?? '')) ? String(bruto) : null
}

export default { perfil, actualizarPerfil, listar, cambiarEstado, cambiarRol, eliminar }
