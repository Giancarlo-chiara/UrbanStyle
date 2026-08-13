/**
 * Reglas de negocio que el cliente necesita para PREVISUALIZAR importes.
 *
 * La fuente de verdad sigue siendo el servidor: OrderService::checkout recalcula
 * subtotal, descuento, envío y total leyendo products.final_price de la base de
 * datos e ignorando cualquier importe que mande el navegador. Esto es solo para
 * que el resumen del carrito muestre la misma cifra antes de confirmar.
 *
 * Si cambias estos valores, cambia también las constantes ENVIO_COSTO y
 * ENVIO_GRATIS_DESDE de backend/src/Services/OrderService.php.
 */
export const ENVIO = {
  COSTO: 15,
  GRATIS_DESDE: 200,
}

/** Tope de unidades por línea; refleja OrderService::MAX_UNIDADES_POR_LINEA. */
export const MAX_UNIDADES_POR_LINEA = 20

/** Calcula el costo de envío igual que el backend. */
export const calcularEnvio = (subtotal) => {
  if (subtotal <= 0) return 0
  return subtotal >= ENVIO.GRATIS_DESDE ? 0 : ENVIO.COSTO
}
