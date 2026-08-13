import express from 'express'
import * as controlador from '../controladores/autenticacion.js'

// Montado en /api/auth
const router = express.Router()

router.post('/register', controlador.registrar)
router.post('/login', controlador.iniciarSesion)

export default router
