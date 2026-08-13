import express from 'express'
import { requiereSesion } from '../middleware/autenticacion.js'
import { crear, listar, mostrar } from '../controladores/pedidos.js'

// Se monta en /api/orders (ver src/app.js).
const router = express.Router()

router.post('/', requiereSesion, crear)
router.get('/', requiereSesion, listar)
router.get('/:id', requiereSesion, mostrar)

export default router
