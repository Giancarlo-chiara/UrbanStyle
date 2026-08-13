import express from 'express'
import { requiereSesion } from '../middleware/autenticacion.js'
import * as favoritos from '../controladores/favoritos.js'

const router = express.Router()

/*
 * Express 4 NO captura el rechazo de una función async: el error no llega al
 * manejador central de app.js, sino a `uncaughtException`, y el proceso se cae.
 * Verificado con la versión instalada (4.22.2). Este envoltorio lo reencamina.
 */
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Las tres rutas exigen sesión, igual que en la versión en PHP.
router.use(requiereSesion)

router.get('/', asincrono(favoritos.listar))
router.post('/', asincrono(favoritos.agregar))
router.delete('/:productId', asincrono(favoritos.eliminar))

export default router
