import 'dotenv/config'
import express from 'express'

/**
 * Prueba de humo del dominio de pedidos contra la base real.
 *
 * Crea un usuario y un producto propios, y los borra al final. El pedido se
 * borra en cascada con sus líneas y su bitácora, así que no queda rastro.
 */

const base = 'C:/Users/gianc/UrbanStyle/backend-node/src'
const { default: rutasPedidos } = await import(`file:///${base}/rutas/pedidos.js`)
const { default: rutasAdminPedidos } = await import(`file:///${base}/rutas/admin-pedidos.js`)
const { default: prisma } = await import(`file:///${base}/config/prisma.js`)
const respuesta = await import(`file:///${base}/utils/respuesta.js`)
const jwt = await import(`file:///${base}/utils/jwt.js`)

const app = express()
app.use(express.json())
app.use('/api/orders', rutasPedidos)
app.use('/api/admin/orders', rutasAdminPedidos)
app.use((req, res) => respuesta.error(res, `Ruta no encontrada: ${req.path}`, 404))
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err instanceof respuesta.ErrorDeNegocio) return respuesta.error(res, err.message, err.status, err.errors)
  if (err?.code === 'P2003') return respuesta.error(res, 'FK', 409)
  console.error(err)
  return respuesta.error(res, 'Error interno del servidor.', 500, { exception: err?.message })
})

const servidor = app.listen(0)
const puerto = servidor.address().port

let fallos = 0
async function pide(metodo, ruta, { cuerpo, token } = {}) {
  const r = await fetch(`http://127.0.0.1:${puerto}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  return { status: r.status, json: await r.json() }
}
function comprueba(etiqueta, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${etiqueta}  ->  ${JSON.stringify(real)}${ok ? '' : ` (esperaba ${JSON.stringify(esperado)})`}`)
}

// --- montaje de datos -------------------------------------------------------
const sello = Date.now()
const categoria = await prisma.categories.findFirst({ select: { id: true } })
const marca = await prisma.brands.findFirst({ select: { id: true } })

const cliente = await prisma.users.create({
  data: { role_id: 2, full_name: 'Cliente Humo', email: `humo_ped_${sello}@ejemplo.test`, password_hash: 'x' },
})
const otro = await prisma.users.create({
  data: { role_id: 2, full_name: 'Otro Humo', email: `humo_otro_${sello}@ejemplo.test`, password_hash: 'x' },
})

// price 120.10 con 15% => final_price 102.09 (generada por PostgreSQL)
const conTalla = await prisma.products.create({
  data: {
    category_id: categoria.id, brand_id: marca.id, name: `Humo Con Talla ${sello}`,
    slug: `humo-con-talla-${sello}`, price: '120.10', discount_percent: '15.00', status: 'activo',
    product_variants: { create: [{ size: 'M', color: 'Negro', stock: 5 }, { size: 'L', color: 'Negro', stock: 1 }] },
  },
  include: { product_variants: true },
})
const sinTalla = await prisma.products.create({
  data: {
    category_id: categoria.id, brand_id: marca.id, name: `Humo Sin Talla ${sello}`,
    slug: `humo-sin-talla-${sello}`, price: '50.00', status: 'activo',
  },
})
const inactivo = await prisma.products.create({
  data: {
    category_id: categoria.id, brand_id: marca.id, name: `Humo Inactivo ${sello}`,
    slug: `humo-inactivo-${sello}`, price: '10.00', status: 'inactivo',
  },
})
const ajeno = await prisma.products.create({
  data: {
    category_id: categoria.id, brand_id: marca.id, name: `Humo Ajeno ${sello}`,
    slug: `humo-ajeno-${sello}`, price: '10.00', status: 'activo',
    product_variants: { create: [{ size: 'S', color: 'Gris', stock: 9 }] },
  },
  include: { product_variants: true },
})
const promoPct = await prisma.promotions.create({
  data: { code: `HUMO10_${sello}`, discount_percent: '10.00', active: true },
})
const promoFija = await prisma.promotions.create({
  data: { code: `HUMOFIJA_${sello}`, discount_amount: '5000.00', active: true },
})
const promoApagada = await prisma.promotions.create({
  data: { code: `HUMOOFF_${sello}`, discount_percent: '50.00', active: false },
})

const varM = conTalla.product_variants.find((v) => v.size === 'M')
const varL = conTalla.product_variants.find((v) => v.size === 'L')
const varAjena = ajeno.product_variants[0]

const token = jwt.firmar({ id: Number(cliente.id), role: 'cliente', email: cliente.email })
const tokenOtro = jwt.firmar({ id: Number(otro.id), role: 'cliente', email: otro.email })
const tokenAdmin = jwt.firmar({ id: Number(cliente.id), role: 'admin', email: cliente.email })

const linea = (extra = {}) => ({ product_id: Number(conTalla.id), variant_id: Number(varM.id), quantity: 1, ...extra })
const creados = []

// --- sesión -----------------------------------------------------------------
let r = await pide('GET', '/api/orders')
comprueba('sin token', r.status, 401)
r = await pide('GET', '/api/admin/orders', { token })
comprueba('cliente en admin', r.status, 403)

// --- validaciones del carrito ----------------------------------------------
const casos = [
  [{}, 'El carrito está vacío.'],
  [{ items: [] }, 'El carrito está vacío.'],
  [{ items: 'x' }, 'El carrito está vacío.'],
  [{ items: [{ quantity: 1 }] }, 'El carrito contiene una línea inválida.'],
  [{ items: [linea({ quantity: 0 })] }, 'La cantidad de cada producto debe ser un entero mayor que 0.'],
  [{ items: [linea({ quantity: 1.5 })] }, 'La cantidad de cada producto debe ser un entero mayor que 0.'],
  [{ items: [linea({ quantity: 21 })] }, 'La cantidad máxima por producto es 20.'],
  [{ items: [linea({ product_id: 999999999 })] }, 'Producto 999999999 no existe.'],
  [{ items: [{ product_id: Number(inactivo.id), quantity: 1 }] }, `El producto "${inactivo.name}" no está disponible.`],
  [{ items: [{ product_id: Number(conTalla.id), quantity: 1 }] }, `Debes elegir una talla para "${conTalla.name}".`],
  [{ items: [linea({ variant_id: 999999999 })] }, `La variante seleccionada para "${conTalla.name}" no existe.`],
  [{ items: [linea({ variant_id: Number(varAjena.id) })] }, `La variante seleccionada no corresponde a "${conTalla.name}".`],
  [{ items: [linea({ variant_id: Number(varL.id), quantity: 2 })] }, `Stock insuficiente para ${conTalla.name} (talla L).`],
  // consolidación: 1 + 1 sobre una variante con 1 en almacén
  [{ items: [linea({ variant_id: Number(varL.id) }), linea({ variant_id: Number(varL.id) })] }, `Stock insuficiente para ${conTalla.name} (talla L).`],
]
for (const [cuerpo, mensaje] of casos) {
  r = await pide('POST', '/api/orders', { token, cuerpo })
  comprueba(`400 "${mensaje.slice(0, 42)}"`, [r.status, r.json.message], [400, mensaje])
}

r = await pide('POST', '/api/orders', { token, cuerpo: { items: [linea()], payment_method: 'x'.repeat(41) } })
comprueba('payment_method largo', [r.status, r.json.message], [422, 'Datos inválidos.'])

// --- checkout: precio de la base, no del cuerpo -----------------------------
const stockAntes = varM.stock
r = await pide('POST', '/api/orders', {
  token,
  cuerpo: { items: [linea({ quantity: 2, unit_price: 1, price: 1 })], payment_method: 'tarjeta' },
})
creados.push(r.json.data?.id)
comprueba('checkout status', r.status, 201)
comprueba('checkout mensaje', r.json.message, 'Pedido creado exitosamente.')
comprueba('checkout subtotal (102.09 x 2)', r.json.data?.subtotal, '204.18')
comprueba('checkout descuento', r.json.data?.discount_total, '0.00')
comprueba('checkout envío gratis (>=200)', r.json.data?.shipping_cost, '0.00')
comprueba('checkout total', r.json.data?.total, '204.18')
comprueba('checkout estado', r.json.data?.status, 'pendiente')
comprueba('checkout nº líneas', r.json.data?.items?.length, 1)
comprueba('checkout precio congelado', r.json.data?.items?.[0]?.unit_price, '102.09')
comprueba('checkout nombre congelado', r.json.data?.items?.[0]?.product_name_snapshot, conTalla.name)
comprueba('checkout id es número', typeof r.json.data?.id, 'number')

let stock = await prisma.product_variants.findUnique({ where: { id: varM.id }, select: { stock: true } })
comprueba('stock descontado', stock.stock, stockAntes - 2)

const bitacora = await prisma.order_status_history.findMany({ where: { order_id: BigInt(creados[0]) } })
comprueba('bitácora inicial', [bitacora.length, bitacora[0]?.status, bitacora[0]?.note], [1, 'pendiente', 'Pedido creado'])

// --- envío, sin variantes ---------------------------------------------------
r = await pide('POST', '/api/orders', { token, cuerpo: { items: [{ product_id: Number(sinTalla.id), quantity: 1 }] } })
creados.push(r.json.data?.id)
comprueba('sin talla: subtotal', r.json.data?.subtotal, '50.00')
comprueba('sin talla: envío 15', r.json.data?.shipping_cost, '15.00')
comprueba('sin talla: total', r.json.data?.total, '65.00')
comprueba('sin talla: variant_id null', r.json.data?.items?.[0]?.variant_id, null)

// --- promociones ------------------------------------------------------------
r = await pide('POST', '/api/orders', { token, cuerpo: { items: [{ product_id: Number(sinTalla.id), quantity: 1 }], promotion_code: promoPct.code } })
creados.push(r.json.data?.id)
comprueba('promo 10%: descuento', r.json.data?.discount_total, '5.00')
comprueba('promo 10%: total', r.json.data?.total, '60.00')

r = await pide('POST', '/api/orders', { token, cuerpo: { items: [{ product_id: Number(sinTalla.id), quantity: 1 }], promotion_code: promoFija.code } })
creados.push(r.json.data?.id)
comprueba('promo fija topada al subtotal', r.json.data?.discount_total, '50.00')
comprueba('promo fija total (solo envío)', r.json.data?.total, '15.00')

r = await pide('POST', '/api/orders', { token, cuerpo: { items: [{ product_id: Number(sinTalla.id), quantity: 1 }], promotion_code: promoApagada.code } })
creados.push(r.json.data?.id)
comprueba('promo inactiva no descuenta', r.json.data?.discount_total, '0.00')

r = await pide('POST', '/api/orders', { token, cuerpo: { items: [{ product_id: Number(sinTalla.id), quantity: 1 }], promotion_code: 'NO_EXISTE' } })
creados.push(r.json.data?.id)
comprueba('promo inexistente no falla', [r.status, r.json.data?.discount_total], [201, '0.00'])

// --- carrera de stock: 0 filas afectadas debe revertir ----------------------
const cuantosAntes = await prisma.orders.count({ where: { user_id: cliente.id } })
await prisma.product_variants.update({ where: { id: varL.id }, data: { stock: 1 } })
// Se vacía la variante DESPUÉS de la validación, simulando otra compra en medio.
const originalRaw = prisma.$transaction.bind(prisma)
r = await (async () => {
  await prisma.product_variants.update({ where: { id: varL.id }, data: { stock: 0 } })
  const previo = await prisma.product_variants.findUnique({ where: { id: varL.id } })
  // Con stock 0 la validación ya rechaza, así que para ejercitar el UPDATE de 0
  // filas se llama al repositorio directamente con una línea imposible.
  const repo = await import(`file:///${base}/repositorios/pedidos.js`)
  try {
    await repo.crear(
      { user_id: cliente.id, subtotal: 1, discount_total: 0, shipping_cost: 0, total: 1, payment_method: 'tarjeta' },
      [{ product_id: conTalla.id, variant_id: varL.id, nombre: conTalla.name, unit_price: 1, quantity: 1, subtotal: 1 }]
    )
    return { status: 0, json: { message: 'NO LANZÓ' } }
  } catch (e) {
    return { status: e.status ?? -1, json: { message: e.message }, previo }
  }
})()
comprueba('sobreventa: lanza 400', r.status, 400)
comprueba('sobreventa: mensaje', r.json.message, `El stock de "${conTalla.name}" se agotó mientras confirmábamos tu pedido.`)
comprueba('sobreventa: revierte el pedido', await prisma.orders.count({ where: { user_id: cliente.id } }), cuantosAntes)
void originalRaw

// --- listado y detalle del cliente -----------------------------------------
r = await pide('GET', '/api/orders', { token })
comprueba('listado status', r.status, 200)
comprueba('listado nº', r.json.data?.length, creados.length)
comprueba('listado campos', Object.keys(r.json.data?.[0] ?? {}).sort(), ['created_at', 'discount_total', 'id', 'payment_method', 'shipping_cost', 'status', 'subtotal', 'total'])
comprueba('listado orden desc', r.json.data?.[0]?.id, creados[creados.length - 1])

r = await pide('GET', `/api/orders/${creados[0]}`, { token })
comprueba('detalle propio', [r.status, r.json.data?.id], [200, creados[0]])
r = await pide('GET', `/api/orders/${creados[0]}`, { token: tokenOtro })
comprueba('detalle ajeno da 404', [r.status, r.json.message], [404, 'Pedido no encontrado.'])
r = await pide('GET', '/api/orders/999999999', { token })
comprueba('detalle inexistente', [r.status, r.json.message], [404, 'Pedido no encontrado.'])
r = await pide('GET', '/api/orders/abc', { token })
comprueba('detalle id basura', [r.status, r.json.message], [404, 'Pedido no encontrado.'])

// --- administración --------------------------------------------------------
r = await pide('GET', '/api/admin/orders', { token: tokenAdmin })
comprueba('admin listado status', r.status, 200)
const mio = r.json.data?.find((o) => o.id === creados[0])
comprueba('admin listado cliente', [mio?.customer_name, mio?.customer_email], ['Cliente Humo', cliente.email])

r = await pide('GET', `/api/admin/orders/${creados[0]}`, { token: tokenAdmin })
comprueba('admin detalle status', r.status, 200)
comprueba('admin detalle cliente', r.json.data?.customer_email, cliente.email)
comprueba('admin detalle dirección', r.json.data?.address, null)
comprueba('admin detalle líneas', r.json.data?.items?.length, 1)
r = await pide('GET', '/api/admin/orders/999999999', { token: tokenAdmin })
comprueba('admin detalle inexistente', [r.status, r.json.message], [404, 'Pedido no encontrado.'])

r = await pide('PUT', `/api/admin/orders/${creados[0]}/status`, { token: tokenAdmin, cuerpo: { status: 'basura' } })
comprueba('estado inválido', [r.status, r.json.message], [422, 'Datos inválidos.'])
r = await pide('PUT', `/api/admin/orders/${creados[0]}/status`, { token: tokenAdmin, cuerpo: {} })
comprueba('estado ausente', r.status, 422)
r = await pide('PUT', `/api/admin/orders/${creados[0]}/status`, { token: tokenAdmin, cuerpo: { status: 'enviado', note: 'x'.repeat(256) } })
comprueba('nota larga', r.status, 422)
r = await pide('PUT', '/api/admin/orders/999999999/status', { token: tokenAdmin, cuerpo: { status: 'enviado' } })
comprueba('estado sobre inexistente', [r.status, r.json.message], [404, 'Pedido no encontrado.'])

r = await pide('PUT', `/api/admin/orders/${creados[0]}/status`, { token: tokenAdmin, cuerpo: { status: 'enviado', note: 'En camino' } })
comprueba('estado ok', [r.status, r.json.message, r.json.data], [200, 'Estado del pedido actualizado.', null])
const tras = await prisma.orders.findUnique({ where: { id: BigInt(creados[0]) } })
comprueba('estado guardado', tras.status, 'enviado')
comprueba('trigger updated_at', tras.updated_at.getTime() > tras.created_at.getTime(), true)
const hist = await prisma.order_status_history.findMany({ where: { order_id: BigInt(creados[0]) }, orderBy: { id: 'asc' } })
comprueba('bitácora tras cambio', [hist.length, hist[1]?.status, hist[1]?.note], [2, 'enviado', 'En camino'])

// --- limpieza --------------------------------------------------------------
await prisma.orders.deleteMany({ where: { user_id: { in: [cliente.id, otro.id] } } })
await prisma.promotions.deleteMany({ where: { id: { in: [promoPct.id, promoFija.id, promoApagada.id] } } })
await prisma.products.deleteMany({ where: { id: { in: [conTalla.id, sinTalla.id, inactivo.id, ajeno.id] } } })
await prisma.users.deleteMany({ where: { id: { in: [cliente.id, otro.id] } } })
await prisma.$disconnect()
servidor.close()

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
