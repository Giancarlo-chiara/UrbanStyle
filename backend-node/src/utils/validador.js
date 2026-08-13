/**
 * Validador de entrada.
 *
 * Reproduce la API de `App\Utils\Validator` (reglas separadas por `|`, parámetro
 * tras `:`) y sus mensajes en español, para que las respuestas 422 sigan teniendo
 * exactamente la misma forma: { campo: [mensajes] }.
 *
 * Corrige tres defectos del original, que están documentados en CORRECCIONES.md:
 *
 *   - Una regla mal escrita se IGNORABA en silencio: un typo como 'requiredd'
 *     desactivaba la validación sin avisar. Aquí lanza un error de programación.
 *   - `min` medía bytes con strlen(); ahora cuenta caracteres reales, así que
 *     'José' son 4 y no 5.
 *   - No existía `max`, por lo que un valor más largo que su columna VARCHAR
 *     reventaba como 500 de PostgreSQL en lugar de un 422 legible.
 */

const longitud = (v) => [...String(v)].length

const reglas = {
  required: (v) => (v === null || v === undefined || String(v).trim() === ''
    ? 'El campo :campo es obligatorio.' : null),

  email: (v) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v))
    ? 'El campo :campo no es un correo válido.' : null),

  numeric: (v) => (v !== null && v !== undefined && v !== '' && Number.isNaN(Number(v))
    ? 'El campo :campo debe ser numérico.' : null),

  integer: (v) => (v !== null && v !== undefined && v !== '' && !Number.isInteger(Number(v))
    ? 'El campo :campo debe ser un número entero.' : null),

  min: (v, p) => (v !== null && v !== undefined && v !== '' && longitud(v) < Number(p)
    ? `El campo :campo debe tener al menos ${p} caracteres.` : null),

  max: (v, p) => (v !== null && v !== undefined && longitud(v) > Number(p)
    ? `El campo :campo no puede tener más de ${p} caracteres.` : null),

  between: (v, p) => {
    if (v === null || v === undefined || v === '') return null
    const [lo, hi] = String(p).split(',').map(Number)
    const n = Number(v)
    return Number.isNaN(n) || n < lo || n > hi
      ? `El campo :campo debe estar entre ${lo} y ${hi}.` : null
  },

  // Comparación laxa a propósito: la versión en PHP usaba in_array estricto, así
  // que un 1 numérico llegado en el JSON nunca casaba con el '1' de la lista.
  in: (v, p) => (v !== null && v !== undefined && v !== ''
    && !String(p).split(',').map((s) => s.trim()).includes(String(v))
    ? `El campo :campo debe ser uno de: ${p}.` : null),
}

/**
 * @param {Record<string, unknown>} datos
 * @param {Record<string, string>} esquema  p. ej. { email: 'required|email' }
 * @returns {Record<string, string[]>} vacío si todo es válido
 */
export function validar(datos, esquema) {
  const errores = {}

  for (const [campo, cadena] of Object.entries(esquema)) {
    for (const bruta of cadena.split('|')) {
      const [nombre, parametro] = bruta.split(':', 2)
      const regla = reglas[nombre]

      if (!regla) {
        // Error de programación, no de la persona que usa la API.
        throw new Error(`Regla de validación desconocida: "${nombre}" en el campo "${campo}".`)
      }

      const mensaje = regla(datos?.[campo], parametro)
      if (mensaje) {
        errores[campo] ??= []
        errores[campo].push(mensaje.replace(':campo', campo))
        break // un error por campo, igual que la versión en PHP
      }
    }
  }

  return errores
}

export default validar
