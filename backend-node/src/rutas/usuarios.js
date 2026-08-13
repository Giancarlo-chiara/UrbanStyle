import express from 'express'
import * as controlador from '../controladores/usuarios.js'
import { requiereSesion } from '../middleware/autenticacion.js'

// Montado en /api/users
const router = express.Router()

router.get('/profile', requiereSesion, controlador.perfil)
router.put('/profile', requiereSesion, controlador.actualizarPerfil)

export default router
