import { verificar } from '../utils/jwt.js'
import { error } from '../utils/respuesta.js'

/**
 * Exige un JWT válido y deja el usuario en `req.usuario`.
 *
 * Mejora estructural frente a la versión en PHP: allí el usuario autenticado se
 * guardaba en `$GLOBALS['auth_user']` y lo leían el middleware de admin y dos
 * ayudantes estáticos. Eso hacía imposible probar los controladores en
 * aislamiento y obligaba a que los middlewares se declararan siempre en el mismo
 * orden. Aquí viaja en el propio `req`, que es el contenedor natural de Express.
 *
 * Y el corte es explícito (`return`), no depende de que la función de respuesta
 * ejecute `exit` como pasaba en PHP: allí, si alguien quitaba ese `exit`, TODAS
 * las rutas protegidas seguían ejecutando su controlador después de haber
 * respondido 401.
 */
export function requiereSesion(req, res, next) {
  const cabecera = req.headers.authorization || ''

  if (!cabecera.startsWith('Bearer ')) {
    return error(res, 'No autorizado. Token no proporcionado.', 401)
  }

  const carga = verificar(cabecera.slice(7))
  if (!carga) {
    return error(res, 'Token inválido o expirado.', 401)
  }

  req.usuario = { id: Number(carga.sub), role: carga.role, email: carga.email }
  return next()
}

/**
 * Exige rol de administrador. Debe ir SIEMPRE después de `requiereSesion`.
 *
 * Limitación heredada, a propósito para no cambiar el comportamiento en esta
 * fase: el rol se lee del token y no se recontrasta con la base de datos, así
 * que degradar a un administrador no le retira el acceso hasta que su token
 * caduque (7 días). Está documentado como pendiente en el informe, §4.2.
 */
export function requiereAdmin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    return error(res, 'Acceso restringido a administradores.', 403)
  }
  return next()
}

export default { requiereSesion, requiereAdmin }
