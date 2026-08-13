import jwt from 'jsonwebtoken'

/**
 * Emisión y verificación de JWT.
 *
 * Se mantienen a propósito el algoritmo (HS256), los claims (`sub`, `role`,
 * `email`) y la vigencia (7 días) de la implementación en PHP, y se reutiliza el
 * mismo `JWT_SECRET`. Consecuencia práctica: los tokens ya emitidos por la API
 * antigua siguen siendo válidos aquí, así que al cambiar de backend nadie pierde
 * la sesión.
 *
 * Diferencia a favor: en PHP el JWT estaba escrito a mano (firma, base64url y
 * comparación en tiempo constante, unas 75 líneas). Aquí lo hace `jsonwebtoken`,
 * que además verifica el algoritmo declarado, cosa que la versión artesanal no
 * comprobaba.
 */

const secreto = process.env.JWT_SECRET
const vigencia = process.env.JWT_EXPIRES_IN || '7d'

if (!secreto || secreto.length < 20) {
  // Fallar aquí es intencionado. La versión en PHP caía en un valor por defecto
  // público ('urbanstyle_dev_secret_change_me') cuando faltaba el .env, así que
  // arrancaba firmando tokens con una clave que cualquiera podía leer en el
  // repositorio y forjarse un token de administrador.
  throw new Error(
    'JWT_SECRET no está definido o es demasiado corto. Ejecuta `node generar-env.mjs`.'
  )
}

export function firmar({ id, role, email }) {
  return jwt.sign(
    { sub: Number(id), role, email },
    secreto,
    { algorithm: 'HS256', expiresIn: vigencia }
  )
}

/** @returns {{sub:number, role:string, email:string}|null} */
export function verificar(token) {
  try {
    return jwt.verify(token, secreto, { algorithms: ['HS256'] })
  } catch {
    return null
  }
}

export default { firmar, verificar }
