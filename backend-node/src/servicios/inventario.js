import prisma from '../config/prisma.js'
import { ErrorDeNegocio } from '../utils/respuesta.js'
import * as inventarioRepo from '../repositorios/inventario.js'

export const TIPOS_MOVIMIENTO = ['entrada', 'salida', 'ajuste']

const UMBRAL_POR_DEFECTO = 5
const UMBRAL_MAXIMO = 1000

export function listar() {
  return inventarioRepo.listarMovimientos()
}

/**
 * El umbral se acota entre 0 y 1000. Sin acotar, `?threshold=999999999` devolvía
 * el catálogo de variantes completo en una sola petición.
 */
export function bajoStock(umbral = UMBRAL_POR_DEFECTO) {
  const numero = Number(umbral)
  const limpio = Number.isFinite(numero) ? Math.trunc(numero) : UMBRAL_POR_DEFECTO
  return inventarioRepo.listarBajoStock(Math.min(UMBRAL_MAXIMO, Math.max(0, limpio)))
}

/**
 * Registra un movimiento y ajusta el stock de la variante, todo en una
 * transacción: si el ajuste del stock falla, el movimiento no queda en la
 * auditoría.
 *
 *   entrada → suma
 *   salida  → resta, y se RECHAZA si la cantidad supera el stock actual
 *   ajuste  → FIJA el stock al valor indicado (no suma)
 *
 * El PHP usaba `GREATEST(0, stock - cantidad)`, así que una salida de 999 sobre 5
 * unidades se aceptaba: dejaba el stock en 0 y registraba 999 en la bitácora. El
 * inventario quedaba cuadrado por la fuerza y la auditoría, mintiendo.
 */
export async function registrar({ varianteId, tipo, cantidad, motivo = null, registradoPor = null }) {
  if (!TIPOS_MOVIMIENTO.includes(tipo)) {
    throw new ErrorDeNegocio('Tipo de movimiento inválido.')
  }

  return prisma.$transaction(async (tx) => {
    const variante = await inventarioRepo.buscarVariante(varianteId, tx)
    if (!variante) {
      throw new ErrorDeNegocio('La variante indicada no existe.', 422)
    }

    const movimiento = await inventarioRepo.crearMovimiento(
      { varianteId, tipo, cantidad, motivo, registradoPor },
      tx
    )

    if (tipo === 'ajuste') {
      await inventarioRepo.fijarStock(varianteId, cantidad, tx)
    } else if (tipo === 'entrada') {
      await inventarioRepo.sumarStock(varianteId, cantidad, tx)
    } else {
      const afectadas = await inventarioRepo.restarStockSiAlcanza(varianteId, cantidad, tx)
      if (afectadas === 0) {
        throw new ErrorDeNegocio(`Stock insuficiente: solo hay ${variante.stock} unidades.`)
      }
    }

    return movimiento
  })
}
