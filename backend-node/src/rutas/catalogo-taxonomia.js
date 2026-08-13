import express from 'express'
import * as categorias from '../controladores/categorias.js'
import * as marcas from '../controladores/marcas.js'

/**
 * Taxonomía pública del catálogo: se monta bajo /api y no lleva autenticación,
 * igual que en PHP. Va en un archivo aparte de `rutas/catalogo.js` (productos)
 * para que los dos dominios no compartan fichero.
 */
const router = express.Router()

router.get('/categories', categorias.indice)
router.get('/brands', marcas.indice)

export default router
