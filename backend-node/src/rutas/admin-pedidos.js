import express from 'express'
import { requiereSesion, requiereAdmin } from '../middleware/autenticacion.js'
import { listarAdmin, mostrarAdmin, actualizarEstado } from '../controladores/pedidos.js'

// Se monta en /api/admin/orders (ver src/app.js).
const router = express.Router()

router.get('/', requiereSesion, requiereAdmin, listarAdmin)
router.get('/:id', requiereSesion, requiereAdmin, mostrarAdmin)
router.put('/:id/status', requiereSesion, requiereAdmin, actualizarEstado)

export default router
