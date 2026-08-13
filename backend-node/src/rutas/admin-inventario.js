import express from 'express'
import { requiereSesion, requiereAdmin } from '../middleware/autenticacion.js'
import * as controlador from '../controladores/inventario.js'

/** Montado en /api/admin/inventory (ver src/app.js). */
const router = express.Router()

const soloAdmin = [requiereSesion, requiereAdmin]

router.get('/', ...soloAdmin, controlador.listar)
router.get('/low-stock', ...soloAdmin, controlador.bajoStock)
router.post('/', ...soloAdmin, controlador.registrar)

export default router
