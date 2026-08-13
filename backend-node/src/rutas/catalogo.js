import express from 'express'
import productos from './catalogo-productos.js'
import taxonomia from './catalogo-taxonomia.js'

/**
 * Catálogo público, montado en /api. Se compone de dos routers para que
 * productos y taxonomía (categorías + marcas) vivan en archivos separados.
 */
const router = express.Router()

router.use(productos)
router.use(taxonomia)

export default router

// Las rutas de /categories y /brands las registra rutas/catalogo-taxonomia.js
