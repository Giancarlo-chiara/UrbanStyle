import * as servicio from '../servicios/autenticacion.js'
import { exito, error } from '../utils/respuesta.js'
import validar from '../utils/validador.js'

/**
 * Las reglas `max` son añadidas: las columnas son VARCHAR(150) y VARCHAR(20), y
 * en PHP un valor más largo llegaba a PostgreSQL y volvía como 500. El mínimo y
 * los mensajes son los mismos que antes, así que ninguna petición válida cambia
 * de respuesta.
 */
export async function registrar(req, res, next) {
  const errores = validar(req.body, {
    full_name: 'required|min:3|max:150',
    email: 'required|email|max:150',
    password: 'required|min:6',
    phone: 'max:20',
  })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  try {
    const resultado = await servicio.registrar(req.body)
    return exito(res, resultado, 'Cuenta creada exitosamente.', 201)
  } catch (e) {
    return next(e)
  }
}

export async function iniciarSesion(req, res, next) {
  const errores = validar(req.body, {
    email: 'required|email',
    password: 'required',
  })
  if (Object.keys(errores).length) {
    return error(res, 'Datos inválidos.', 422, errores)
  }

  try {
    const resultado = await servicio.iniciarSesion(req.body.email, req.body.password)
    return exito(res, resultado, 'Sesión iniciada.')
  } catch (e) {
    return next(e)
  }
}

export default { registrar, iniciarSesion }
