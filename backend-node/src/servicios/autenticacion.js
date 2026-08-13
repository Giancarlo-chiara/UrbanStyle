import bcrypt from 'bcryptjs'
import * as usuarios from '../repositorios/usuarios.js'
import { ErrorDeNegocio } from '../utils/respuesta.js'
import { firmar } from '../utils/jwt.js'

const COSTE_BCRYPT = 10 // el mismo que usaba PASSWORD_BCRYPT en PHP

const ROL_CLIENTE = 2

/**
 * Hash real de una contraseña aleatoria que nadie conoce. Solo sirve para gastar
 * el mismo tiempo de CPU cuando el email no existe (ver `iniciarSesion`).
 */
const HASH_DE_DESCARTE = '$2b$10$fwuj0JDjEZLO2LHC3cQQ9u07OyBEFa3X9S9nR330jxCIxUAUFibjy'

export async function registrar({ full_name, email, password, phone = null }) {
  if (await usuarios.buscarPorEmail(email)) {
    throw new ErrorDeNegocio('Ya existe una cuenta con ese email.', 409)
  }

  const usuario = await usuarios.crear({
    full_name,
    email,
    password_hash: await bcrypt.hash(password, COSTE_BCRYPT),
    phone: phone ?? null,
    role_id: ROL_CLIENTE,
  })

  return { user: usuario, token: firmarToken(usuario) }
}

export async function iniciarSesion(email, password) {
  const usuario = await usuarios.buscarPorEmail(email)

  /*
   * Un solo mensaje para "el email no existe" y para "la clave no coincide":
   * distinguirlos convierte el login en un comprobador de qué correos están
   * registrados. Se compara igualmente contra un hash de descarte cuando el
   * usuario no existe, para no filtrar la respuesta por el tiempo de respuesta.
   */
  const hash = usuario?.password_hash ?? HASH_DE_DESCARTE
  const coincide = await bcrypt.compare(String(password), hash)

  if (!usuario || !coincide) {
    throw new ErrorDeNegocio('Credenciales incorrectas.', 401)
  }

  // El estado se revisa DESPUÉS de validar la clave: avisar de que una cuenta
  // está bloqueada antes de eso ya sería confirmar que el email existe.
  if (usuario.status !== 'activo') {
    throw new ErrorDeNegocio('Tu cuenta está inactiva o bloqueada.', 401)
  }

  const { password_hash, ...publico } = usuario
  return { user: publico, token: firmarToken(publico) }
}

export async function perfil(idUsuario) {
  const usuario = await usuarios.buscarPorId(idUsuario)
  if (!usuario) {
    throw new ErrorDeNegocio('El usuario no existe.', 404)
  }
  return usuario
}

function firmarToken(usuario) {
  return firmar({ id: usuario.id, role: usuario.role, email: usuario.email })
}

export default { registrar, iniciarSesion, perfil }
