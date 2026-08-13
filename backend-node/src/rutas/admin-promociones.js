import express from 'express'
import { requiereSesion, requiereAdmin } from '../middleware/autenticacion.js'
import * as promociones from '../controladores/promociones.js'

const router = express.Router()

/* Ver la nota de rutas/favoritos.js: Express 4 no reencamina los rechazos de
 * una función async al manejador central. */
const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

router.use(requiereSesion, requiereAdmin)

router.get('/', asincrono(promociones.listar))
router.post('/', asincrono(promociones.crear))
router.put('/:id', asincrono(promociones.actualizar))
router.delete('/:id', asincrono(promociones.eliminar))

export default router
