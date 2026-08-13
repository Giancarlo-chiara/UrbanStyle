import 'dotenv/config'
import express from 'express'

const base = 'C:/Users/gianc/UrbanStyle/backend-node/src'
const { default: rutasFavoritos } = await import(`file:///${base}/rutas/favoritos.js`)
const { default: rutasAdminPromociones } = await import(`file:///${base}/rutas/admin-promociones.js`)
const { default: prisma } = await import(`file:///${base}/config/prisma.js`)
const { firmar } = await import(`file:///${base}/utils/jwt.js`)
const respuesta = await import(`file:///${base}/utils/respuesta.js`)

const app = express()
app.use(express.json())
app.use('/api/favorites', rutasFavoritos)
app.use('/api/admin/promotions', rutasAdminPromociones)
app.use((req, res) => respuesta.error(res, `Ruta no encontrada: ${req.path}`, 404))
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err instanceof respuesta.ErrorDeNegocio) return respuesta.error(res, err.message, err.status, err.errors)
  if (err?.code === 'P2002') return respuesta.error(res, 'Ya existe un registro con ese valor único.', 409)
  if (err?.code === 'P2003') return respuesta.error(res, 'La operación viola una referencia entre tablas.', 409)
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
      ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  })
  return { status: r.status, json: await r.json() }
}
function comprueba(etiqueta, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${etiqueta}  ->  ${JSON.stringify(real)}${ok ? '' : ` (esperaba ${JSON.stringify(esperado)})`}`)
}

// --- datos reales de la base -------------------------------------------------
const cliente = await prisma.users.findFirst({ where: { role_id: 2 }, include: { roles: true } })
const admin = await prisma.users.findFirst({ where: { role_id: 1 }, include: { roles: true } })
const producto = await prisma.products.findFirst({ orderBy: { id: 'asc' } })
console.log(`usuario=${cliente?.id} admin=${admin?.id} producto=${producto?.id}\n`)

const tokenCliente = firmar({ id: cliente.id, role: cliente.roles.name, email: cliente.email })
const tokenAdmin = firmar({ id: admin.id, role: admin.roles.name, email: admin.email })
const idProducto = Number(producto.id)

// ============================== FAVORITOS ===================================
console.log('--- favoritos ---')
let r = await pide('GET', '/api/favorites')
comprueba('sin token', r.status, 401)

r = await pide('POST', '/api/favorites', { token: tokenCliente, cuerpo: {} })
comprueba('sin product_id status', r.status, 422)
comprueba('sin product_id mensaje', r.json.message, 'product_id es requerido.')

r = await pide('POST', '/api/favorites', { token: tokenCliente, cuerpo: { product_id: 'abc' } })
comprueba('product_id no entero', r.status, 422)
console.log('   errors:', JSON.stringify(r.json.errors))

r = await pide('POST', '/api/favorites', { token: tokenCliente, cuerpo: { product_id: 999999 } })
comprueba('producto inexistente status', r.status, 422)
comprueba('producto inexistente errors', r.json.errors, { product_id: ['El producto no existe.'] })

r = await pide('POST', '/api/favorites', { token: tokenCliente, cuerpo: { product_id: idProducto } })
comprueba('agregar status', r.status, 201)
comprueba('agregar mensaje', r.json.message, 'Agregado a favoritos.')

r = await pide('POST', '/api/favorites', { token: tokenCliente, cuerpo: { product_id: idProducto } })
comprueba('agregar repetido (idempotente)', r.status, 201)

r = await pide('GET', '/api/favorites', { token: tokenCliente })
comprueba('listar status', r.status, 200)
const fav = r.json.data.find((p) => p.id === idProducto)
comprueba('listar contiene el producto', Boolean(fav), true)
comprueba('listar campos', Object.keys(fav ?? {}).sort(), [
  'brand', 'category', 'created_at', 'discount_percent', 'final_price', 'id',
  'image', 'name', 'price', 'rating_avg', 'rating_count', 'slug', 'stock',
].sort())
comprueba('id es número', typeof fav.id, 'number')
comprueba('stock es número', typeof fav.stock, 'number')
comprueba('price con 2 decimales', /^\d+\.\d{2}$/.test(fav.price), true)
console.log('   fila:', JSON.stringify(fav))

r = await pide('DELETE', `/api/favorites/${idProducto}`, { token: tokenCliente })
comprueba('eliminar status', r.status, 200)
comprueba('eliminar mensaje', r.json.message, 'Eliminado de favoritos.')

r = await pide('DELETE', `/api/favorites/${idProducto}`, { token: tokenCliente })
comprueba('eliminar repetido', r.status, 200)

r = await pide('DELETE', '/api/favorites/abc', { token: tokenCliente })
comprueba('eliminar id basura', r.status, 422)

// ============================= PROMOCIONES ==================================
console.log('\n--- promociones ---')
r = await pide('GET', '/api/admin/promotions', { token: tokenCliente })
comprueba('cliente no pasa', r.status, 403)

r = await pide('GET', '/api/admin/promotions', { token: tokenAdmin })
comprueba('listar status', r.status, 200)
console.log('   primera:', JSON.stringify(r.json.data[0]))

const casos = [
  ['cuerpo vacío', {}],
  ['code corto', { code: 'AB', discount_percent: 10 }],
  ['sin descuento', { code: 'HUMO_X' }],
  ['dos descuentos', { code: 'HUMO_X', discount_percent: 10, discount_amount: 5 }],
  ['porcentaje fuera de rango', { code: 'HUMO_X', discount_percent: 150 }],
  ['applies_to inválido', { code: 'HUMO_X', discount_percent: 10, applies_to: 'marca' }],
  ['categoria sin category_id', { code: 'HUMO_X', discount_percent: 10, applies_to: 'categoria' }],
  ['producto sin product_id', { code: 'HUMO_X', discount_percent: 10, applies_to: 'producto' }],
  ['fechas invertidas', { code: 'HUMO_X', discount_percent: 10, starts_at: '2026-02-01', ends_at: '2026-01-01' }],
  ['fecha ilegible', { code: 'HUMO_X', discount_percent: 10, starts_at: 'ayer' }],
]
for (const [etiqueta, cuerpo] of casos) {
  const res = await pide('POST', '/api/admin/promotions', { token: tokenAdmin, cuerpo })
  comprueba(`crear ${etiqueta}`, res.status, 422)
  console.log('   errors:', JSON.stringify(res.json.errors))
}

const codigo = `humo${Date.now()}`.slice(0, 20)
r = await pide('POST', '/api/admin/promotions', {
  token: tokenAdmin,
  // Cuerpo tal como lo manda el formulario del panel: fechas vacías y el
  // descuento no usado en null.
  cuerpo: {
    code: codigo,
    description: 'Promoción de humo',
    discount_percent: 15,
    discount_amount: null,
    applies_to: 'todo',
    starts_at: '',
    ends_at: '',
    active: true,
  },
})
comprueba('crear status', r.status, 201)
comprueba('crear mensaje', r.json.message, 'Promoción creada.')
const idPromo = r.json.data?.id
comprueba('crear devuelve id', typeof idPromo, 'number')

const creada = await prisma.promotions.findUnique({ where: { id: BigInt(idPromo) } })
comprueba('código en mayúsculas', creada.code, codigo.toUpperCase())
comprueba('fechas vacías -> null', [creada.starts_at, creada.ends_at], [null, null])

r = await pide('POST', '/api/admin/promotions', { token: tokenAdmin, cuerpo: { code: codigo, discount_percent: 5 } })
comprueba('código repetido status', r.status, 409)
comprueba('código repetido mensaje', r.json.message, 'Ya existe una promoción con ese código.')

r = await pide('PUT', `/api/admin/promotions/${idPromo}`, {
  token: tokenAdmin,
  cuerpo: { code: codigo, discount_percent: null, discount_amount: 20, applies_to: 'todo', starts_at: '2026-01-01', ends_at: '2026-12-31', active: false },
})
comprueba('actualizar status', r.status, 200)
comprueba('actualizar mensaje', r.json.message, 'Promoción actualizada.')
const tras = await prisma.promotions.findUnique({ where: { id: BigInt(idPromo) } })
comprueba('actualizar monto', String(tras.discount_amount), '20')
comprueba('actualizar porcentaje a null', tras.discount_percent, null)
comprueba('actualizar active', tras.active, false)

// El PUT deja la promoción sin ningún descuento: se rechaza mirando el estado
// resultante, no solo el cuerpo.
r = await pide('PUT', `/api/admin/promotions/${idPromo}`, { token: tokenAdmin, cuerpo: { discount_amount: null } })
comprueba('actualizar sin descuento', r.status, 422)
console.log('   errors:', JSON.stringify(r.json.errors))

r = await pide('PUT', '/api/admin/promotions/999999', { token: tokenAdmin, cuerpo: { active: true } })
comprueba('actualizar inexistente', r.status, 404)
comprueba('actualizar inexistente mensaje', r.json.message, 'Promoción no encontrada.')

r = await pide('PUT', '/api/admin/promotions/abc', { token: tokenAdmin, cuerpo: { active: true } })
comprueba('actualizar id basura', r.status, 404)

// --- buscarActivaPorCodigo (lo usa el dominio de pedidos) --------------------
const servicio = await import(`file:///${base}/servicios/promociones.js`)
await prisma.promotions.update({
  where: { id: BigInt(idPromo) },
  data: { active: true, starts_at: null, ends_at: null },
})
comprueba('activa por código', (await servicio.buscarActivaPorCodigo(codigo.toUpperCase()))?.code, codigo.toUpperCase())

await prisma.promotions.update({ where: { id: BigInt(idPromo) }, data: { active: false } })
comprueba('inactiva no sale', await servicio.buscarActivaPorCodigo(codigo.toUpperCase()), null)

await prisma.promotions.update({
  where: { id: BigInt(idPromo) },
  data: { active: true, starts_at: new Date('2030-01-01'), ends_at: new Date('2030-02-01') },
})
comprueba('fuera de vigencia no sale', await servicio.buscarActivaPorCodigo(codigo.toUpperCase()), null)

r = await pide('DELETE', `/api/admin/promotions/${idPromo}`, { token: tokenAdmin })
comprueba('eliminar status', r.status, 200)
comprueba('eliminar mensaje', r.json.message, 'Promoción eliminada.')

r = await pide('DELETE', `/api/admin/promotions/${idPromo}`, { token: tokenAdmin })
comprueba('eliminar inexistente', r.status, 404)

console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLOS`}`)
servidor.close()
await prisma.$disconnect()
process.exit(fallos === 0 ? 0 : 1)
