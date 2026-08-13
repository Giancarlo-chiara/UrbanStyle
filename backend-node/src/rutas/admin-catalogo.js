import express from 'express'
import * as categorias from '../controladores/categorias.js'
import * as marcas from '../controladores/marcas.js'
import { requiereSesion, requiereAdmin } from '../middleware/autenticacion.js'

/**
 * Panel de administración: categorías y marcas. Se monta bajo /api/admin.
 *
 * Los middlewares se declaran ruta a ruta y NO con `router.use(...)`. Este router
 * cuelga del prefijo /api/admin, que es padre de /api/admin/users, /orders,
 * /inventory y /promotions: un `router.use` se ejecutaría también en todas esas
 * peticiones al pasar por aquí de camino a su propio router, y convertiría un
 * 404 de ruta desconocida bajo /api/admin en un 401.
 */
const router = express.Router()

const soloAdmin = [requiereSesion, requiereAdmin]

router.get('/categories', soloAdmin, categorias.indiceAdmin)
router.post('/categories', soloAdmin, categorias.crear)
router.put('/categories/:id', soloAdmin, categorias.actualizar)
router.delete('/categories/:id', soloAdmin, categorias.eliminar)

router.get('/brands', soloAdmin, marcas.indiceAdmin)
router.post('/brands', soloAdmin, marcas.crear)
router.put('/brands/:id', soloAdmin, marcas.actualizar)
router.delete('/brands/:id', soloAdmin, marcas.eliminar)

export default router
