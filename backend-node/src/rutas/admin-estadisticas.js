import express from 'express'
import { exito } from '../utils/respuesta.js'
import { requiereSesion, requiereAdmin } from '../middleware/autenticacion.js'
import * as estadisticas from '../repositorios/estadisticas.js'

const router = express.Router()

router.use(requiereSesion, requiereAdmin)

/**
 * GET /api/admin/stats
 *
 * Todo el resumen del panel en UNA petición. Antes el panel hacía cuatro y dos
 * de ellas se traían tablas completas para contarlas en el navegador.
 *
 * `?threshold=` ajusta el umbral de stock bajo; se acota entre 0 y 1000 para que
 * nadie pueda pedir un recuento sobre todo el inventario.
 */
router.get('/', async (req, res, next) => {
  try {
    const umbral = Math.min(1000, Math.max(0, Number(req.query.threshold ?? 5) || 5))

    const [resumen, masVendidos, ultimosPedidos, stockCritico] = await Promise.all([
      estadisticas.resumen(umbral),
      estadisticas.masVendidos(5),
      estadisticas.ultimosPedidos(5),
      estadisticas.stockCritico(umbral, 10),
    ])

    return exito(res, { umbral, ...resumen, masVendidos, ultimosPedidos, stockCritico })
  } catch (e) {
    return next(e)
  }
})

export default router
