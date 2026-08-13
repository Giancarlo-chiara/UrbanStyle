import { ErrorDeNegocio } from '../utils/respuesta.js'
import * as pedidos from '../repositorios/pedidos.js'
import { buscarPorId as buscarProductoPorId, buscarVariantePorId } from '../repositorios/productos.js'
import { buscarActivaPorCodigo } from '../repositorios/promociones.js'

/** Tope de unidades por línea de pedido. */
export const MAX_UNIDADES_POR_LINEA = 20

/**
 * Política de envío. Si cambias esto, cambia también ENVIO en
 * ecommerce/src/config/negocio.js, que la usa para previsualizar el carrito.
 */
export const ENVIO_COSTO = 15
export const ENVIO_GRATIS_DESDE = 200

/** Estados que admite un pedido. Es el orden en que los presenta el panel. */
export const ESTADOS_PEDIDO = [
  'pendiente',
  'pagado',
  'procesando',
  'enviado',
  'entregado',
  'cancelado',
]

/**
 * Confirma una compra.
 *
 * `carga` = { address_id?, payment_method?, promotion_code?,
 *             items: [ { product_id, variant_id?, quantity } ] }
 *
 * Regla de oro: del cuerpo de la petición solo se cree QUÉ se compra y CUÁNTO.
 * Los precios se leen siempre de la base de datos.
 */
export async function realizarCompra(usuarioId, carga) {
  const items = carga?.items
  if (!Array.isArray(items) || items.length === 0) {
    throw new ErrorDeNegocio('El carrito está vacío.')
  }

  let subtotal = 0
  const lineas = []
  // Consolida líneas repetidas (misma variante) para comprobar el stock una sola
  // vez contra la cantidad TOTAL pedida: dos líneas de 3 unidades sobre una
  // variante con 4 en almacén deben rechazarse, y por separado ambas pasaban.
  const pedidoPorVariante = new Map()

  for (const item of items) {
    if (!esObjeto(item) || vacio(item.product_id)) {
      throw new ErrorDeNegocio('El carrito contiene una línea inválida.')
    }

    const cantidad = aEnteroEstricto(item.quantity)
    if (cantidad === null || cantidad < 1) {
      throw new ErrorDeNegocio('La cantidad de cada producto debe ser un entero mayor que 0.')
    }
    if (cantidad > MAX_UNIDADES_POR_LINEA) {
      throw new ErrorDeNegocio(`La cantidad máxima por producto es ${MAX_UNIDADES_POR_LINEA}.`)
    }

    const productoId = aEnteroEstricto(item.product_id)
    const producto = productoId === null ? null : await buscarProductoPorId(productoId)
    if (!producto) {
      throw new ErrorDeNegocio(`Producto ${item.product_id} no existe.`)
    }
    if (producto.status !== 'activo') {
      throw new ErrorDeNegocio(`El producto "${producto.name}" no está disponible.`)
    }

    let variante = null
    const tieneVariantes = variantesDe(producto).length > 0

    if (!vacio(item.variant_id)) {
      const varianteId = aEnteroEstricto(item.variant_id)
      variante = varianteId === null ? null : await buscarVariantePorId(varianteId)
      if (!variante) {
        throw new ErrorDeNegocio(`La variante seleccionada para "${producto.name}" no existe.`)
      }
      // La variante DEBE pertenecer al producto de la línea: sin esta
      // comprobación se podía cobrar un producto y descontar el stock de otro.
      if (String(variante.product_id) !== String(producto.id)) {
        throw new ErrorDeNegocio(`La variante seleccionada no corresponde a "${producto.name}".`)
      }

      const clave = String(variante.id)
      const acumulada = (pedidoPorVariante.get(clave) ?? 0) + cantidad
      if (Number(variante.stock) < acumulada) {
        throw new ErrorDeNegocio(`Stock insuficiente para ${producto.name} (talla ${variante.size}).`)
      }
      pedidoPorVariante.set(clave, acumulada)
    } else if (tieneVariantes) {
      // Sin variant_id no hay ni validación ni descuento de stock: se podría
      // comprar cualquier cantidad de un producto agotado.
      throw new ErrorDeNegocio(`Debes elegir una talla para "${producto.name}".`)
    }

    const precioUnitario = Number(producto.final_price)
    const subtotalLinea = redondear2(precioUnitario * cantidad)
    subtotal += subtotalLinea

    lineas.push({
      product_id: producto.id,
      variant_id: variante?.id ?? null,
      nombre: producto.name,
      unit_price: precioUnitario,
      quantity: cantidad,
      subtotal: subtotalLinea,
    })
  }

  subtotal = redondear2(subtotal)
  const descuento = await calcularDescuento(subtotal, carga.promotion_code)
  // Se compara el importe redondeado y no la resta cruda: en coma flotante
  // 220.20 - 20.20 da 200.00000000000003, y el caso simétrico —quedarse una
  // millonésima por debajo de 200— cobraría 15 soles de envío en un pedido que
  // el carrito ya había anunciado como gratuito.
  const baseEnvio = redondear2(subtotal - descuento)
  const envio = baseEnvio >= ENVIO_GRATIS_DESDE ? 0 : ENVIO_COSTO
  const total = redondear2(baseEnvio + envio)

  const id = await pedidos.crear(
    {
      user_id: usuarioId,
      address_id: vacio(carga.address_id) ? null : aEnteroEstricto(carga.address_id),
      subtotal,
      discount_total: descuento,
      shipping_cost: envio,
      total,
      payment_method: carga.payment_method ?? 'tarjeta',
      promotion_code: carga.promotion_code ?? null,
    },
    lineas
  )

  return pedidos.buscarPorId(id)
}

export async function listarDelUsuario(usuarioId) {
  return pedidos.buscarPorUsuario(usuarioId)
}

/**
 * Pedido de un cliente concreto.
 *
 * Un pedido ajeno responde 404 y no 403: un 403 confirmaría que ese pedido
 * existe, y los identificadores son consecutivos.
 */
export async function buscarDelUsuario(id, usuarioId) {
  const idPedido = aEnteroEstricto(id)
  const orden = idPedido === null ? null : await pedidos.buscarPorId(idPedido)

  if (!orden || Number(orden.user_id) !== Number(usuarioId)) {
    throw new ErrorDeNegocio('Pedido no encontrado.', 404)
  }

  return orden
}

// ---------------- Administración ----------------

export async function listarTodos() {
  return pedidos.buscarTodos()
}

export async function buscarDetalleAdmin(id) {
  const idPedido = aEnteroEstricto(id)
  const orden = idPedido === null ? null : await pedidos.buscarDetalleAdmin(idPedido)
  if (!orden) {
    throw new ErrorDeNegocio('Pedido no encontrado.', 404)
  }
  return orden
}

export async function cambiarEstado(id, status, note = null) {
  const idPedido = aEnteroEstricto(id)
  const actualizado = idPedido === null ? false : await pedidos.actualizarEstado(idPedido, status, note)
  if (!actualizado) {
    throw new ErrorDeNegocio('Pedido no encontrado.', 404)
  }
}

// ---------------- Interno ----------------

async function calcularDescuento(subtotal, codigo) {
  if (vacio(codigo)) return 0

  const promo = await buscarActivaPorCodigo(String(codigo))
  // Un código inexistente o caducado no es un error: simplemente no descuenta,
  // igual que hacía la API en PHP.
  if (!promo) return 0

  /*
   * El porcentaje manda sobre el importe fijo cuando la promoción trae los dos.
   * La versión en PHP preguntaba por la verdad del valor y, al llegar de PDO como
   * cadena, un "0.00" también era verdadero; el criterio real era "la columna no
   * es NULL", que es lo que se comprueba aquí.
   */
  if (promo.discount_percent != null) {
    return redondear2(subtotal * (Number(promo.discount_percent) / 100))
  }
  if (promo.discount_amount != null) {
    // El descuento no puede dejar el subtotal en negativo.
    return Math.min(subtotal, redondear2(Number(promo.discount_amount)))
  }
  return 0
}

const esObjeto = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Equivalente de `empty()` de PHP, para conservar los mismos rechazos. */
const vacio = (v) => v === undefined || v === null || v === false || v === 0 || v === '' || v === '0'

/**
 * Entero estricto, como `filter_var(..., FILTER_VALIDATE_INT)`: acepta el número
 * 3 y la cadena "3", pero no 3.5 ni "3.0" ni "3 unidades".
 * @returns {number|null}
 */
function aEnteroEstricto(valor) {
  if (typeof valor === 'number') return Number.isInteger(valor) ? valor : null
  if (typeof valor === 'bigint') return Number(valor)
  if (typeof valor === 'string' && /^[+-]?\d+$/.test(valor.trim())) return Number(valor.trim())
  return null
}

/**
 * Las variantes del producto. El repositorio de productos las publica como
 * `variants`; se acepta también el nombre de la relación de Prisma para que un
 * cambio de forma allí no desactive en silencio la exigencia de talla, que es lo
 * único que impide vender sin control de stock.
 */
const variantesDe = (producto) => producto.variants ?? producto.product_variants ?? []

/**
 * Redondeo a dos decimales con el mismo resultado que `round()` de PHP.
 *
 * `toFixed()` no vale: 15.015 se guarda en binario como 15.01499…, así que daría
 * 15.01 donde PHP daba 15.02. PHP corrige eso mirando el valor con la precisión
 * significativa del double antes de redondear, y es lo que replica el
 * `toPrecision(15)`. Solo se nota en los descuentos por porcentaje, pero se nota
 * en un céntimo del total cobrado.
 */
function redondear2(n) {
  const escalado = Number((n * 100).toPrecision(15))
  return Math.round(escalado) / 100
}

export default {
  MAX_UNIDADES_POR_LINEA,
  ENVIO_COSTO,
  ENVIO_GRATIS_DESDE,
  ESTADOS_PEDIDO,
  realizarCompra,
  listarDelUsuario,
  buscarDelUsuario,
  listarTodos,
  buscarDetalleAdmin,
  cambiarEstado,
}
