import express from 'express'
import {
  listar,
  destacados,
  novedades,
  ofertas,
  tallas,
  detalle,
  relacionados,
} from '../controladores/productos.js'

const router = express.Router()

// El orden importa: las rutas literales deben declararse ANTES de /:id, o
// /products/featured entraría por el detalle con id = "featured".
router.get('/products', listar)
router.get('/products/featured', destacados)
router.get('/products/new', novedades)
router.get('/products/offers', ofertas)
router.get('/products/sizes', tallas)
router.get('/products/:id', detalle)
router.get('/products/:id/related', relacionados)

export default router
