/**
 * Comparador diferencial PHP vs Node.
 *
 * Lanza la MISMA secuencia de peticiones a los dos backends y contrasta las
 * respuestas. Es la prueba de que el port no cambio el contrato.
 *
 *   node pruebas/comparar.mjs http://127.0.0.1:8000 http://127.0.0.1:8001
 *                             \_ PHP (referencia)   \_ Node (candidato)
 *
 * Cómo trata cada tipo de endpoint:
 *
 *   - LECTURA (catálogo, categorías, marcas…): comparación estricta de la
 *     estructura y los valores, ignorando solo los campos volátiles.
 *   - ESCRITURA (registro, pedido…): no se pueden comparar valor a valor porque
 *     cada backend crea filas distintas. Se comparan la FORMA (el conjunto de
 *     claves), el código HTTP y el resultado de negocio (importes, mensajes de
 *     rechazo, si el stock bajó).
 *
 * Campos volátiles que se normalizan antes de comparar: identificadores nuevos,
 * fechas, y `created_at` — cuyo formato cambia a propósito (PHP devolvía el texto
 * crudo de PostgreSQL, Node devuelve ISO 8601).
 */

const [, , BASE_A = 'http://127.0.0.1:8000', BASE_B = 'http://127.0.0.1:8001'] = process.argv

const ADMIN = { email: 'admin@urbanstyle.pe', password: 'Admin123!' }

let ok = 0
let fallos = 0
const detalles = []

const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  mal: (s) => `\x1b[31m${s}\x1b[0m`,
  gris: (s) => `\x1b[90m${s}\x1b[0m`,
  neg: (s) => `\x1b[1m${s}\x1b[0m`,
}

async function pedir(base, ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const cab = { 'Content-Type': 'application/json' }
  if (token) cab.Authorization = `Bearer ${token}`
  try {
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: cab,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
    const texto = await r.text()
    let json = null
    try { json = JSON.parse(texto) } catch { /* cuerpo no JSON */ }
    return { http: r.status, json, texto }
  } catch (e) {
    return { http: 0, json: null, texto: String(e) }
  }
}

/** Sustituye lo que legítimamente cambia entre ejecuciones. */
function normalizar(valor, clave = null) {
  const VOLATILES = new Set(['created_at', 'updated_at', 'starts_at', 'ends_at', 'token'])
  if (VOLATILES.has(clave)) return '<volátil>'
  if (valor === null || valor === undefined) return null
  if (Array.isArray(valor)) return valor.map((v) => normalizar(v, clave))
  if (typeof valor === 'object') {
    const o = {}
    for (const k of Object.keys(valor).sort()) o[k] = normalizar(valor[k], k)
    return o
  }
  return valor
}

function diferencias(a, b, ruta = '') {
  const salida = []
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a
  const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b

  if (ta !== tb) return [`${ruta || '(raíz)'}: tipo ${ta} vs ${tb}`]

  if (ta === 'array') {
    if (a.length !== b.length) salida.push(`${ruta}: longitud ${a.length} vs ${b.length}`)
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      salida.push(...diferencias(a[i], b[i], `${ruta}[${i}]`))
    }
    return salida
  }

  if (ta === 'object') {
    const claves = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of claves) {
      if (!(k in a)) { salida.push(`${ruta}.${k}: falta en PHP, presente en Node`); continue }
      if (!(k in b)) { salida.push(`${ruta}.${k}: presente en PHP, FALTA en Node`); continue }
      salida.push(...diferencias(a[k], b[k], `${ruta}.${k}`))
    }
    return salida
  }

  if (a !== b) salida.push(`${ruta}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`)
  return salida
}

function registrar(nombre, difs, extra = '') {
  if (difs.length === 0) {
    ok++
    console.log(`  ${c.ok('✓')} ${nombre}${extra ? c.gris('  ' + extra) : ''}`)
  } else {
    fallos++
    console.log(`  ${c.mal('✗')} ${nombre}`)
    difs.slice(0, 6).forEach((d) => console.log(`      ${c.mal(d)}`))
    if (difs.length > 6) console.log(`      ${c.gris(`… y ${difs.length - 6} más`)}`)
    detalles.push({ nombre, difs })
  }
}

/** Compara una petición de solo lectura en los dos backends. */
async function compararLectura(nombre, ruta, opciones = {}) {
  const [a, b] = await Promise.all([
    pedir(BASE_A, ruta, opciones),
    pedir(BASE_B, ruta, opciones),
  ])
  const difs = []
  if (a.http !== b.http) difs.push(`HTTP ${a.http} vs ${b.http}`)
  difs.push(...diferencias(normalizar(a.json), normalizar(b.json)))
  registrar(nombre, difs, `HTTP ${a.http}`)
  return { a, b }
}

/** Compara solo el conjunto de claves y el código HTTP (para escrituras). */
async function compararForma(nombre, ruta, opciones = {}) {
  const [a, b] = await Promise.all([
    pedir(BASE_A, ruta, opciones),
    pedir(BASE_B, ruta, opciones),
  ])
  const difs = []
  if (a.http !== b.http) difs.push(`HTTP ${a.http} vs ${b.http}`)

  const claves = (x) => {
    const d = x.json?.data
    if (d === null || d === undefined) return []
    if (Array.isArray(d)) return d.length ? Object.keys(d[0]).sort() : []
    return Object.keys(d).sort()
  }
  const ka = claves(a).join(',')
  const kb = claves(b).join(',')
  if (ka !== kb) difs.push(`claves de data:\n        PHP  ${ka}\n        Node ${kb}`)

  if (a.json?.message !== b.json?.message) {
    difs.push(`message: ${JSON.stringify(a.json?.message)} vs ${JSON.stringify(b.json?.message)}`)
  }
  registrar(nombre, difs, `HTTP ${a.http}`)
  return { a, b }
}

// =====================================================================
console.log(c.neg(`\nComparando  PHP ${BASE_A}   vs   Node ${BASE_B}\n`))

// ---- Disponibilidad --------------------------------------------------
for (const [etiqueta, base] of [['PHP', BASE_A], ['Node', BASE_B]]) {
  const r = await pedir(base, '/api/health')
  if (r.http !== 200) {
    console.error(c.mal(`\n  ${etiqueta} no responde en ${base} (HTTP ${r.http}). Arráncalo primero.\n`))
    process.exit(1)
  }
}

console.log(c.neg('CATÁLOGO PÚBLICO'))
await compararLectura('GET /health', '/api/health')
await compararLectura('GET /products (12 primeros)', '/api/products?limit=12')
await compararLectura('GET /products?category=zapatillas', '/api/products?category=zapatillas&limit=50')
await compararLectura('GET /products?brand=nike', '/api/products?brand=nike&limit=50')
await compararLectura('GET /products?search=polo', '/api/products?search=polo&limit=50')
await compararLectura('GET /products?onSale=1', '/api/products?onSale=1&limit=50')
await compararLectura('GET /products?sort=price_asc', '/api/products?sort=price_asc&limit=50')
await compararLectura('GET /products?sort=price_desc', '/api/products?sort=price_desc&limit=50')
await compararLectura('GET /products?minPrice&maxPrice', '/api/products?minPrice=100&maxPrice=300&limit=50')
await compararLectura('GET /products?size=40', '/api/products?size=40&limit=50')
await compararLectura('GET /products (página 2)', '/api/products?limit=12&page=2')
await compararLectura('GET /products?limit=-1 (acotado)', '/api/products?limit=-1')
await compararLectura('GET /products/featured', '/api/products/featured')
await compararLectura('GET /products/new', '/api/products/new')
await compararLectura('GET /products/offers', '/api/products/offers')
await compararLectura('GET /products/sizes', '/api/products/sizes')
await compararLectura('GET /products/1', '/api/products/1')
await compararLectura('GET /products/99999 (404)', '/api/products/99999')
await compararLectura('GET /products/abc (404)', '/api/products/abc')
await compararLectura('GET /categories', '/api/categories')
await compararLectura('GET /brands', '/api/brands')
// Diferencia ACEPTADA y deliberada: el PHP tenía tres formas distintas de error
// (Response::error con `errors`, el 404 del router SIN `errors`, y el fallo de
// conexión con `error` en singular). En Node todas usan el mismo envoltorio, así
// que un cliente puede leer `errors` de forma uniforme. Aquí solo se comprueba
// que coincidan el código y el mensaje.
{
  const [a, b] = await Promise.all([
    pedir(BASE_A, '/api/no-existe'),
    pedir(BASE_B, '/api/no-existe'),
  ])
  const difs = []
  if (a.http !== b.http) difs.push(`HTTP ${a.http} vs ${b.http}`)
  if (a.json?.success !== b.json?.success) difs.push('difiere `success`')
  if (a.json?.message !== b.json?.message) {
    difs.push(`message: ${JSON.stringify(a.json?.message)} vs ${JSON.stringify(b.json?.message)}`)
  }
  registrar('GET /ruta-inexistente (404) — Node añade `errors:null` a propósito', difs, `HTTP ${a.http}`)
}

console.log(c.neg('\nAUTENTICACIÓN'))
await compararForma('POST /auth/login (admin)', '/api/auth/login', { metodo: 'POST', cuerpo: ADMIN })
await compararForma('POST /auth/login (clave mala → 401)', '/api/auth/login',
  { metodo: 'POST', cuerpo: { email: ADMIN.email, password: 'incorrecta' } })
await compararForma('POST /auth/login (sin campos → 422)', '/api/auth/login',
  { metodo: 'POST', cuerpo: {} })
await compararForma('POST /auth/register (inválido → 422)', '/api/auth/register',
  { metodo: 'POST', cuerpo: { full_name: 'x', email: 'no-es-correo', password: '123' } })

const tokenA = (await pedir(BASE_A, '/api/auth/login', { metodo: 'POST', cuerpo: ADMIN })).json?.data?.token
const tokenB = (await pedir(BASE_B, '/api/auth/login', { metodo: 'POST', cuerpo: ADMIN })).json?.data?.token

console.log(c.neg('\nSIN AUTORIZACIÓN (deben coincidir los rechazos)'))
for (const ruta of ['/api/users/profile', '/api/orders', '/api/favorites', '/api/admin/products']) {
  await compararLectura(`GET ${ruta} sin token → 401`, ruta)
}

console.log(c.neg('\nPANEL ADMIN (con token de administrador)'))
if (tokenA && tokenB) {
  const opA = { token: tokenA }
  const opB = { token: tokenB }
  for (const ruta of [
    '/api/admin/products',
    '/api/admin/categories',
    '/api/admin/brands',
    '/api/admin/users',
    '/api/admin/orders',
    '/api/admin/inventory',
    '/api/admin/inventory/low-stock',
    '/api/admin/promotions',
  ]) {
    const [a, b] = await Promise.all([pedir(BASE_A, ruta, opA), pedir(BASE_B, ruta, opB)])
    const difs = []
    if (a.http !== b.http) difs.push(`HTTP ${a.http} vs ${b.http}`)
    difs.push(...diferencias(normalizar(a.json), normalizar(b.json)))
    registrar(`GET ${ruta}`, difs, `HTTP ${a.http}`)
  }
} else {
  console.log(c.mal('  no se pudo iniciar sesión como admin en ambos backends'))
  fallos++
}

console.log(c.neg('\nREGLAS DE NEGOCIO DEL CHECKOUT (mismos rechazos, mismos mensajes)'))
async function clienteNuevo(base) {
  const r = await pedir(base, '/api/auth/register', {
    metodo: 'POST',
    cuerpo: {
      full_name: 'Comparador Prueba',
      email: `comp${Date.now()}${Math.floor(Math.random() * 1e6)}@urbanstyle.pe`,
      password: 'Clave123456',
    },
  })
  return r.json?.data?.token
}
const cliA = await clienteNuevo(BASE_A)
const cliB = await clienteNuevo(BASE_B)

const detalle = (await pedir(BASE_A, '/api/products/1')).json?.data
const variante = detalle?.variants?.find((v) => Number(v.stock) >= 1)
const otro = (await pedir(BASE_A, '/api/products/7')).json?.data

const casos = [
  ['carrito vacío', { items: [] }],
  ['sin variant_id', { items: [{ product_id: 1, quantity: 1 }] }],
  ['cantidad 0', { items: [{ product_id: 1, variant_id: Number(variante?.id), quantity: 0 }] }],
  ['cantidad negativa', { items: [{ product_id: 1, variant_id: Number(variante?.id), quantity: -3 }] }],
  ['cantidad excesiva', { items: [{ product_id: 1, variant_id: Number(variante?.id), quantity: 9999 }] }],
  ['producto inexistente', { items: [{ product_id: 999999, variant_id: Number(variante?.id), quantity: 1 }] }],
  ['variante de otro producto', { items: [{ product_id: 1, variant_id: Number(otro?.variants?.[0]?.id), quantity: 1 }] }],
]

for (const [nombre, cuerpo] of casos) {
  const [a, b] = await Promise.all([
    pedir(BASE_A, '/api/orders', { metodo: 'POST', cuerpo: { ...cuerpo, payment_method: 'tarjeta' }, token: cliA }),
    pedir(BASE_B, '/api/orders', { metodo: 'POST', cuerpo: { ...cuerpo, payment_method: 'tarjeta' }, token: cliB }),
  ])
  const difs = []
  if (a.http !== b.http) difs.push(`HTTP ${a.http} vs ${b.http}`)
  if (a.json?.message !== b.json?.message) {
    difs.push(`mensaje:\n        PHP  ${JSON.stringify(a.json?.message)}\n        Node ${JSON.stringify(b.json?.message)}`)
  }
  registrar(`rechazo: ${nombre}`, difs, `HTTP ${a.http}`)
}

console.log(c.neg('\nCOMPRA REAL (cada backend en su propia base de datos lógica)'))
async function comprar(base, token) {
  const det = (await pedir(base, '/api/products/2')).json?.data
  const v = det?.variants?.find((x) => Number(x.stock) >= 2)
  if (!v) return { error: 'sin variante con stock' }
  const antes = Number(v.stock)
  const r = await pedir(base, '/api/orders', {
    metodo: 'POST',
    token,
    cuerpo: {
      items: [{ product_id: 2, variant_id: Number(v.id), quantity: 2 }],
      payment_method: 'tarjeta',
      promotion_code: 'BIENVENIDA10',
    },
  })
  const det2 = (await pedir(base, '/api/products/2')).json?.data
  const despues = Number(det2?.variants?.find((x) => Number(x.id) === Number(v.id))?.stock)
  return {
    http: r.http,
    orden: r.json?.data,
    claves: r.json?.data ? Object.keys(r.json.data).sort().join(',') : '',
    stockAntes: antes,
    stockDespues: despues,
  }
}
const compraA = await comprar(BASE_A, cliA)
const compraB = await comprar(BASE_B, cliB)

const difsCompra = []
if (compraA.http !== compraB.http) difsCompra.push(`HTTP ${compraA.http} vs ${compraB.http}`)
if (compraA.claves !== compraB.claves) {
  difsCompra.push(`claves de la orden:\n        PHP  ${compraA.claves}\n        Node ${compraB.claves}`)
}
for (const campo of ['subtotal', 'discount_total', 'shipping_cost', 'total', 'status', 'payment_method']) {
  const va = compraA.orden?.[campo]
  const vb = compraB.orden?.[campo]
  if (String(va) !== String(vb)) difsCompra.push(`${campo}: ${va} vs ${vb}`)
}
const bajoA = compraA.stockAntes - compraA.stockDespues
const bajoB = compraB.stockAntes - compraB.stockDespues
if (bajoA !== bajoB) difsCompra.push(`el stock bajó ${bajoA} en PHP y ${bajoB} en Node`)
if (bajoA !== 2) difsCompra.push(`PHP no descontó 2 unidades (bajó ${bajoA})`)
registrar('pedido con cupón: importes, forma y descuento de stock', difsCompra,
  `total PHP ${compraA.orden?.total} · Node ${compraB.orden?.total}`)

const idA = compraA.orden?.id
const idB = compraB.orden?.id
if (idA && idB) {
  const [ha, hb] = await Promise.all([
    pedir(BASE_A, '/api/orders', { token: cliA }),
    pedir(BASE_B, '/api/orders', { token: cliB }),
  ])
  const ka = ha.json?.data?.[0] ? Object.keys(ha.json.data[0]).sort().join(',') : ''
  const kb = hb.json?.data?.[0] ? Object.keys(hb.json.data[0]).sort().join(',') : ''
  registrar('GET /orders (historial): forma', ka === kb ? [] : [`claves:\n        PHP  ${ka}\n        Node ${kb}`])

  const otroA = await clienteNuevo(BASE_A)
  const otroB = await clienteNuevo(BASE_B)
  const [ia, ib] = await Promise.all([
    pedir(BASE_A, `/api/orders/${idA}`, { token: otroA }),
    pedir(BASE_B, `/api/orders/${idB}`, { token: otroB }),
  ])
  registrar('aislamiento entre clientes (IDOR) → 404',
    ia.http === ib.http && ia.http === 404 ? [] : [`HTTP ${ia.http} vs ${ib.http} (se esperaba 404 en ambos)`])
}

// =====================================================================
const total = ok + fallos
console.log(c.neg(`\n${'─'.repeat(60)}`))
console.log(`  ${c.ok(`${ok} coinciden`)}   ${fallos ? c.mal(`${fallos} difieren`) : c.gris('0 difieren')}   de ${total}`)
console.log(c.neg('─'.repeat(60)))

if (fallos) {
  console.log(c.mal('\nDiferencias que hay que resolver:'))
  detalles.forEach(({ nombre }) => console.log(`  · ${nombre}`))
  console.log()
  process.exit(1)
}
console.log(c.ok('\nEl backend Node responde igual que el PHP en todo lo comprobado.\n'))
