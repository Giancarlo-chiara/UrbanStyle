import serializar from './serializar.js'

/**
 * Envoltorio único de todas las respuestas de la API, idéntico al que producía
 * `App\Utils\Response` en PHP:
 *
 *   éxito → { success: true,  message, data }
 *   error → { success: false, message, errors }
 *
 * Se mantiene la clave `errors` incluso cuando vale null, porque el frontend la
 * lee de forma uniforme (`err.response.data.errors`).
 */

export function exito(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data: serializar(data),
  })
}

export function error(res, message = 'Error', status = 400, errors = null) {
  return res.status(status).json({
    success: false,
    message,
    errors: errors ?? null,
  })
}

/**
 * Error de negocio. Equivale a la `RuntimeException` que lanzaban los Services
 * en PHP: el manejador central lo traduce al código HTTP indicado en lugar de
 * dejarlo caer como un 500.
 */
export class ErrorDeNegocio extends Error {
  constructor(message, status = 400, errors = null) {
    super(message)
    this.name = 'ErrorDeNegocio'
    this.status = status
    this.errors = errors
  }
}

export default { exito, error, ErrorDeNegocio }
