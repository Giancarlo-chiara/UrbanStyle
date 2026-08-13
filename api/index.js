/**
 * Punto de entrada para Vercel.
 *
 * En Vercel NO hay un servidor escuchando en un puerto: la plataforma invoca
 * esta función por cada petición. Por eso aquí se exporta la app de Express en
 * lugar de llamar a `app.listen()` — eso solo ocurre en `backend-node/src/server.js`,
 * que es el arranque para desarrollo local.
 *
 * Express es compatible con esta forma porque una app suya ES un manejador
 * `(req, res)` válido.
 *
 * El `vercel.json` de la raíz reescribe /api/* hacia este archivo, y la app
 * conserva sus rutas con el prefijo /api, así que no hay que tocar el enrutado.
 */
import app from '../backend-node/src/app.js'

export default app
