import express from 'express'
import * as controlador from '../controladores/usuarios.js'
import { requiereSesion, requiereAdmin } from '../middleware/autenticacion.js'

// Montado en /api/admin/users
const router = express.Router()

router.use(requiereSesion, requiereAdmin)

router.get('/', controlador.listar)
router.put('/:id/status', controlador.cambiarEstado)
router.put('/:id/role', controlador.cambiarRol)
router.delete('/:id', controlador.eliminar)

export default router
