import express from 'express'
import { requiereSesion, requiereAdmin } from '../middleware/autenticacion.js'
import * as controlador from '../controladores/admin-productos.js'

/** Montado en /api/admin/products (ver src/app.js). */
const router = express.Router()

const soloAdmin = [requiereSesion, requiereAdmin]

router.get('/', ...soloAdmin, controlador.listar)
router.post('/', ...soloAdmin, controlador.crear)

/*
 * Las rutas de imágenes y variantes van ANTES de las de `/:id`. Express casa por
 * orden de declaración, así que si `/:id` estuviera arriba, un
 * `PUT /variants/12` entraría por ella con id = "variants".
 */
router.delete('/images/:imageId', ...soloAdmin, controlador.quitarImagen)
router.put('/variants/:variantId', ...soloAdmin, controlador.actualizarVariante)
router.delete('/variants/:variantId', ...soloAdmin, controlador.eliminarVariante)

router.get('/:id', ...soloAdmin, controlador.detalle)
router.put('/:id', ...soloAdmin, controlador.actualizar)
router.delete('/:id', ...soloAdmin, controlador.eliminar)
router.post('/:id/images', ...soloAdmin, controlador.anadirImagen)
router.post('/:id/variants', ...soloAdmin, controlador.anadirVariante)

export default router
