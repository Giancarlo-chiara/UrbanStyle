import 'dotenv/config'
import express from 'express'

/**
 * Humo del panel de productos + inventario.
 *
 * Crea un producto de prueba, le pasa por encima todas las rutas del dominio y lo
 * borra al final. No toca ningún dato existente salvo para LEER (busca un producto
 * con ventas para comprobar el 409 del RESTRICT).
 */

const base = 'C:/Users/gianc/UrbanStyle/backend-node/src'
const { default: rutasAdminProductos } = await import(`file:///${base}/rutas/admin-productos.js`)
const { default: rutasAdminInventario } = await import(`file:///${base}/rutas/admin-inventario.js`)
const { default: prisma } = await import(`file:///${base}/config/prisma.js`)
const { firmar } = await import(`file:///${base}/utils/jwt.js`)
const respuesta = await import(`file:///${base}/utils/respuesta.js`)

const app = express()
app.use(express.json())
app.use('/api/admin/products', rutasAdminProductos)
app.use('/api/admin/inventory', rutasAdminInventario)
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

const admin = await prisma.users.findFirst({ where: { role_id: 1 } })
const token = firmar({ id: admin.id, role: 'admin', email: admin.email })
const tokenCliente = firmar({ id: admin.id, role: 'cliente', email: admin.email })
const categoriaFila = await prisma.categories.findFirst()
const marcaFila = await prisma.brands.findFirst()
const categoria = { id: Number(categoriaFila.id) }
const marca = { id: Number(marcaFila.id) }

let r
let idProducto

try {
  // --- acceso -----------------------------------------------------------------
  r = await pide('GET', '/api/admin/products')
  comprueba('sin token', r.status, 401)
  r = await pide('GET', '/api/admin/products', { token: tokenCliente })
  comprueba('token de cliente', r.status, 403)
  r = await pide('GET', '/api/admin/inventory', { token: tokenCliente })
  comprueba('inventario con token de cliente', r.status, 403)

  // --- listado ----------------------------------------------------------------
  r = await pide('GET', '/api/admin/products', { token })
  comprueba('listado status', r.status, 200)
  comprueba('listado limit por defecto', r.json.data?.pagination?.limit, 100)
  const inactivos = await prisma.products.count({ where: { status: 'inactivo' } })
  const visibles = r.json.data.items.filter((p) => p.status === 'inactivo').length
  console.log(`   inactivos en la BD: ${inactivos}; visibles en la página 1: ${visibles}`)

  // --- create -----------------------------------------------------------------
  r = await pide('POST', '/api/admin/products', { token, cuerpo: { name: 'ab' } })
  comprueba('create vacío status', r.status, 422)
  comprueba('create vacío mensaje', r.json.message, 'Datos inválidos.')
  console.log('   errors:', JSON.stringify(r.json.errors))

  r = await pide('POST', '/api/admin/products', {
    token,
    cuerpo: { name: 'Producto de humo', category_id: categoria.id, brand_id: marca.id, price: 100, discount_percent: 150 },
  })
  comprueba('descuento > 100', r.status, 422)

  r = await pide('POST', '/api/admin/products', {
    token,
    cuerpo: { name: 'Producto de humo', category_id: categoria.id, brand_id: marca.id, price: 100, status: 'raro' },
  })
  comprueba('status inválido', r.status, 422)

  r = await pide('POST', '/api/admin/products', {
    token,
    cuerpo: { name: 'Producto de humo', category_id: 99999999, brand_id: marca.id, price: 100 },
  })
  comprueba('categoría inexistente status', r.status, 422)
  comprueba('categoría inexistente campo', r.json.errors?.category_id, ['La categoría indicada no existe.'])

  r = await pide('POST', '/api/admin/products', {
    token,
    cuerpo: { name: 'Producto de humo', category_id: categoria.id, brand_id: 99999999, price: 100 },
  })
  comprueba('marca inexistente campo', r.json.errors?.brand_id, ['La marca indicada no existe.'])

  r = await pide('POST', '/api/admin/products', {
    token,
    cuerpo: {
      name: 'Producto de humo',
      description: 'Creado por pruebas/humo-admin-productos.mjs',
      category_id: categoria.id,
      brand_id: marca.id,
      price: 200,
      discount_percent: 10,
      status: 'activo',
      is_featured: false,
      slug: 'slug-inventado-por-el-cliente',
      final_price: 1,
    },
  })
  comprueba('create status', r.status, 201)
  comprueba('create mensaje', r.json.message, 'Producto creado.')
  comprueba('create final_price calculado', r.json.data?.final_price, '180.00')
  comprueba('create ignoró el slug del cliente', r.json.data?.slug?.startsWith('producto-de-humo-'), true)
  comprueba('create trae images', Array.isArray(r.json.data?.images), true)
  comprueba('create trae variants', Array.isArray(r.json.data?.variants), true)
  idProducto = r.json.data.id

  // --- show / update ----------------------------------------------------------
  r = await pide('GET', `/api/admin/products/${idProducto}`, { token })
  comprueba('show status', r.status, 200)
  r = await pide('GET', '/api/admin/products/999999999', { token })
  comprueba('show inexistente status', r.status, 404)
  comprueba('show inexistente mensaje', r.json.message, 'Producto no encontrado.')

  r = await pide('PUT', '/api/admin/products/999999999', { token, cuerpo: { name: 'Otro nombre' } })
  comprueba('update inexistente status', r.status, 404)
  comprueba('update inexistente mensaje', r.json.message, 'Producto no encontrado.')

  r = await pide('PUT', `/api/admin/products/${idProducto}`, { token, cuerpo: { status: 'agotado' } })
  comprueba('update parcial status', r.status, 200)
  comprueba('update mensaje', r.json.message, 'Producto actualizado.')
  comprueba('update aplicado', r.json.data?.status, 'agotado')

  r = await pide('PUT', `/api/admin/products/${idProducto}`, { token, cuerpo: { price: 100, discount_percent: 0 } })
  comprueba('update precio', r.json.data?.final_price, '100.00')

  r = await pide('DELETE', '/api/admin/products/999999999', { token })
  comprueba('destroy inexistente status', r.status, 404)

  // --- imágenes ---------------------------------------------------------------
  r = await pide('POST', `/api/admin/products/${idProducto}/images`, { token, cuerpo: {} })
  comprueba('imagen sin url status', r.status, 422)
  comprueba('imagen sin url mensaje', r.json.message, 'url es requerida.')

  r = await pide('POST', `/api/admin/products/${idProducto}/images`, {
    token,
    cuerpo: { url: `https://ejemplo.test/${'x'.repeat(500)}.jpg` },
  })
  comprueba('imagen url larga status', r.status, 422)

  r = await pide('POST', `/api/admin/products/${idProducto}/images`, { token, cuerpo: { url: 'https://ejemplo.test/1.jpg' } })
  comprueba('imagen 1 status', r.status, 201)
  comprueba('imagen 1 mensaje', r.json.message, 'Imagen agregada.')
  const idImagen1 = r.json.data.id

  r = await pide('GET', `/api/admin/products/${idProducto}`, { token })
  comprueba('la primera imagen es principal', r.json.data.images[0].is_primary, true)

  await pide('POST', `/api/admin/products/${idProducto}/images`, { token, cuerpo: { url: 'https://ejemplo.test/2.jpg' } })
  r = await pide('POST', `/api/admin/products/${idProducto}/images`, {
    token,
    cuerpo: { url: 'https://ejemplo.test/3.jpg', is_primary: true },
  })
  comprueba('imagen 3 status', r.status, 201)

  r = await pide('GET', `/api/admin/products/${idProducto}`, { token })
  comprueba('solo una principal', r.json.data.images.filter((i) => i.is_primary).length, 1)
  comprueba('la principal es la última marcada', r.json.data.images.find((i) => i.is_primary)?.url, 'https://ejemplo.test/3.jpg')

  r = await pide('DELETE', `/api/admin/products/images/${idImagen1}`, { token })
  comprueba('borrar imagen status', r.status, 200)
  comprueba('borrar imagen mensaje', r.json.message, 'Imagen eliminada.')
  r = await pide('DELETE', '/api/admin/products/images/999999999', { token })
  comprueba('borrar imagen inexistente', r.status, 404)

  // --- variantes --------------------------------------------------------------
  r = await pide('POST', `/api/admin/products/${idProducto}/variants`, { token, cuerpo: { stock: 5 } })
  comprueba('variante sin talla status', r.status, 422)
  console.log('   errors:', JSON.stringify(r.json.errors))

  r = await pide('POST', `/api/admin/products/${idProducto}/variants`, {
    token,
    cuerpo: { size: 'M', color: 'Negro', stock: -1 },
  })
  comprueba('variante stock negativo', r.status, 422)

  r = await pide('POST', `/api/admin/products/${idProducto}/variants`, {
    token,
    cuerpo: { size: 'M', color: 'Negro', stock: 10 },
  })
  comprueba('variante status', r.status, 201)
  comprueba('variante mensaje', r.json.message, 'Variante agregada.')
  const idVariante = r.json.data.id

  r = await pide('POST', `/api/admin/products/${idProducto}/variants`, {
    token,
    cuerpo: { size: 'M', color: 'Negro', stock: 3 },
  })
  comprueba('variante duplicada status', r.status, 409)
  console.log('   mensaje:', r.json.message)

  r = await pide('PUT', `/api/admin/products/variants/${idVariante}`, { token, cuerpo: {} })
  comprueba('stock ausente status', r.status, 422)
  const sigueEn10 = await prisma.product_variants.findUnique({ where: { id: BigInt(idVariante) } })
  comprueba('stock ausente NO vació el stock', sigueEn10.stock, 10)

  r = await pide('PUT', `/api/admin/products/variants/${idVariante}`, { token, cuerpo: { stock: 7 } })
  comprueba('stock status', r.status, 200)
  comprueba('stock mensaje', r.json.message, 'Variante actualizada.')

  r = await pide('PUT', '/api/admin/products/variants/999999999', { token, cuerpo: { stock: 7 } })
  comprueba('variante inexistente status', r.status, 404)

  // --- inventario -------------------------------------------------------------
  r = await pide('POST', '/api/admin/inventory', { token, cuerpo: { variant_id: idVariante, type: 'regalo', quantity: 1 } })
  comprueba('tipo inválido status', r.status, 422)

  r = await pide('POST', '/api/admin/inventory', { token, cuerpo: { variant_id: idVariante, type: 'entrada', quantity: 0 } })
  comprueba('cantidad 0 status', r.status, 422)

  r = await pide('POST', '/api/admin/inventory', { token, cuerpo: { variant_id: 999999999, type: 'entrada', quantity: 1 } })
  comprueba('variante inexistente status', r.status, 422)
  comprueba('variante inexistente mensaje', r.json.message, 'La variante indicada no existe.')

  r = await pide('POST', '/api/admin/inventory', {
    token,
    cuerpo: { variant_id: idVariante, type: 'entrada', quantity: 5, reason: 'Compra de humo' },
  })
  comprueba('entrada status', r.status, 201)
  comprueba('entrada mensaje', r.json.message, 'Movimiento de inventario registrado.')
  let variante = await prisma.product_variants.findUnique({ where: { id: BigInt(idVariante) } })
  comprueba('entrada suma (7 + 5)', variante.stock, 12)

  r = await pide('POST', '/api/admin/inventory', { token, cuerpo: { variant_id: idVariante, type: 'salida', quantity: 2 } })
  comprueba('salida status', r.status, 201)
  variante = await prisma.product_variants.findUnique({ where: { id: BigInt(idVariante) } })
  comprueba('salida resta (12 - 2)', variante.stock, 10)

  const movimientosAntes = await prisma.inventory_movements.count({ where: { variant_id: BigInt(idVariante) } })
  r = await pide('POST', '/api/admin/inventory', { token, cuerpo: { variant_id: idVariante, type: 'salida', quantity: 999 } })
  comprueba('salida imposible status', r.status, 400)
  comprueba('salida imposible mensaje', r.json.message, 'Stock insuficiente: solo hay 10 unidades.')
  variante = await prisma.product_variants.findUnique({ where: { id: BigInt(idVariante) } })
  comprueba('salida imposible no tocó el stock', variante.stock, 10)
  comprueba(
    'salida imposible no dejó rastro (rollback)',
    await prisma.inventory_movements.count({ where: { variant_id: BigInt(idVariante) } }),
    movimientosAntes
  )

  r = await pide('POST', '/api/admin/inventory', { token, cuerpo: { variant_id: idVariante, type: 'ajuste', quantity: 3 } })
  comprueba('ajuste status', r.status, 201)
  variante = await prisma.product_variants.findUnique({ where: { id: BigInt(idVariante) } })
  comprueba('ajuste FIJA el stock', variante.stock, 3)

  r = await pide('GET', '/api/admin/inventory', { token })
  comprueba('bitácora status', r.status, 200)
  comprueba('bitácora es array', Array.isArray(r.json.data), true)
  comprueba('bitácora acotada a 200', r.json.data.length <= 200, true)
  const mio = r.json.data.find((m) => m.product_name === 'Producto de humo')
  comprueba('bitácora trae el producto', mio?.product_name, 'Producto de humo')
  comprueba('bitácora trae el stock actual', mio?.current_stock, 3)
  comprueba('bitácora trae quién lo registró', mio?.created_by_name, admin.full_name)
  console.log('   fila:', JSON.stringify(mio))

  r = await pide('GET', '/api/admin/inventory/low-stock', { token })
  comprueba('low-stock status', r.status, 200)
  comprueba('low-stock incluye la variante (3 <= 5)', r.json.data.some((v) => v.variant_id === idVariante), true)

  r = await pide('GET', '/api/admin/inventory/low-stock?threshold=0', { token })
  comprueba('low-stock threshold=0 excluye la variante', r.json.data.some((v) => v.variant_id === idVariante), false)

  r = await pide('GET', '/api/admin/inventory/low-stock?threshold=abc', { token })
  comprueba('low-stock threshold no numérico usa 5', r.json.data.some((v) => v.variant_id === idVariante), true)

  const todas = await prisma.product_variants.count()
  r = await pide('GET', '/api/admin/inventory/low-stock?threshold=99999999', { token })
  comprueba('low-stock threshold acotado a 1000', r.json.data.length <= todas, true)

  // --- borrado con ventas -----------------------------------------------------
  const vendido = await prisma.order_items.findFirst({ select: { product_id: true } })
  if (vendido) {
    r = await pide('DELETE', `/api/admin/products/${vendido.product_id}`, { token })
    comprueba('borrar producto con ventas status', r.status, 409)
    comprueba('borrar producto con ventas mensaje', r.json.message, 'No se puede eliminar: el producto tiene ventas registradas.')
    const sigue = await prisma.products.count({ where: { id: vendido.product_id } })
    comprueba('el producto con ventas sigue ahí', sigue, 1)
  } else {
    console.log('   (sin order_items en la BD: no se pudo probar el RESTRICT)')
  }

  // --- borrado -----------------------------------------------------------------
  r = await pide('DELETE', `/api/admin/products/variants/${idVariante}`, { token })
  comprueba('borrar variante status', r.status, 200)
  comprueba('borrar variante mensaje', r.json.message, 'Variante eliminada.')

  r = await pide('DELETE', `/api/admin/products/${idProducto}`, { token })
  comprueba('borrar producto status', r.status, 200)
  comprueba('borrar producto mensaje', r.json.message, 'Producto eliminado.')
  comprueba('borrado de verdad', await prisma.products.count({ where: { id: BigInt(idProducto) } }), 0)
  idProducto = null
} finally {
  if (idProducto) {
    await prisma.products.deleteMany({ where: { id: BigInt(idProducto) } })
    console.log('   (limpieza: producto de prueba eliminado)')
  }
  console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLOS`}`)
  servidor.close()
  await prisma.$disconnect()
}

process.exit(fallos === 0 ? 0 : 1)
