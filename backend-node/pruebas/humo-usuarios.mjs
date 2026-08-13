import 'dotenv/config'
import express from 'express'

const base = 'C:/Users/gianc/UrbanStyle/backend-node/src'
const { default: rutasAuth } = await import(`file:///${base}/rutas/auth.js`)
const { default: rutasUsuarios } = await import(`file:///${base}/rutas/usuarios.js`)
const { default: rutasAdminUsuarios } = await import(`file:///${base}/rutas/admin-usuarios.js`)
const { default: prisma } = await import(`file:///${base}/config/prisma.js`)
const respuesta = await import(`file:///${base}/utils/respuesta.js`)

const app = express()
app.use(express.json())
app.use('/api/auth', rutasAuth)
app.use('/api/users', rutasUsuarios)
app.use('/api/admin/users', rutasAdminUsuarios)
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
const url = (p) => `http://127.0.0.1:${puerto}${p}`

let fallos = 0
async function pide(metodo, ruta, { cuerpo, token } = {}) {
  const r = await fetch(url(ruta), {
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
  const ok = real === esperado
  if (!ok) fallos++
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${etiqueta}  ->  ${JSON.stringify(real)}${ok ? '' : ` (esperaba ${JSON.stringify(esperado)})`}`)
}

const correo = `humo_${Date.now()}@ejemplo.test`

// --- registro ---------------------------------------------------------------
let r = await pide('POST', '/api/auth/register', { cuerpo: { full_name: 'Ab', email: 'no-es-correo', password: '123' } })
comprueba('register inválido status', r.status, 422)
comprueba('register inválido mensaje', r.json.message, 'Datos inválidos.')
console.log('   errors:', JSON.stringify(r.json.errors))

r = await pide('POST', '/api/auth/register', { cuerpo: { full_name: 'Usuario Humo', email: correo, password: 'secreta123', phone: '987654321' } })
comprueba('register status', r.status, 201)
comprueba('register mensaje', r.json.message, 'Cuenta creada exitosamente.')
comprueba('register role', r.json.data?.user?.role, 'cliente')
comprueba('register sin hash', 'password_hash' in (r.json.data?.user ?? {}), false)
console.log('   user:', JSON.stringify(r.json.data?.user))
const idNuevo = r.json.data.user.id

r = await pide('POST', '/api/auth/register', { cuerpo: { full_name: 'Usuario Humo', email: correo, password: 'secreta123' } })
comprueba('register duplicado status', r.status, 409)
comprueba('register duplicado mensaje', r.json.message, 'Ya existe una cuenta con ese email.')

// --- login ------------------------------------------------------------------
r = await pide('POST', '/api/auth/login', { cuerpo: { email: correo, password: 'mala' } })
comprueba('login clave mala', r.json.message, 'Credenciales incorrectas.')
comprueba('login clave mala status', r.status, 401)

r = await pide('POST', '/api/auth/login', { cuerpo: { email: 'nadie@ejemplo.test', password: 'x' } })
comprueba('login inexistente', r.json.message, 'Credenciales incorrectas.')

r = await pide('POST', '/api/auth/login', { cuerpo: { email: correo, password: 'secreta123' } })
comprueba('login status', r.status, 200)
comprueba('login mensaje', r.json.message, 'Sesión iniciada.')
comprueba('login sin hash', 'password_hash' in (r.json.data?.user ?? {}), false)
const tokenCliente = r.json.data.token

// bloqueado
await prisma.users.update({ where: { id: BigInt(idNuevo) }, data: { status: 'bloqueado' } })
r = await pide('POST', '/api/auth/login', { cuerpo: { email: correo, password: 'secreta123' } })
comprueba('login bloqueado mensaje', r.json.message, 'Tu cuenta está inactiva o bloqueada.')
comprueba('login bloqueado status', r.status, 401)
await prisma.users.update({ where: { id: BigInt(idNuevo) }, data: { status: 'activo' } })

// --- perfil -----------------------------------------------------------------
r = await pide('GET', '/api/users/profile')
comprueba('perfil sin token', r.status, 401)

r = await pide('GET', '/api/users/profile', { token: tokenCliente })
comprueba('perfil status', r.status, 200)
comprueba('perfil mensaje', r.json.message, 'OK')
console.log('   perfil:', JSON.stringify(r.json.data))

r = await pide('PUT', '/api/users/profile', { token: tokenCliente, cuerpo: { full_name: '', phone: '1' } })
comprueba('perfil nombre vacío', r.status, 422)

r = await pide('PUT', '/api/users/profile', { token: tokenCliente, cuerpo: { full_name: 'Nombre Cambiado', phone: '999888777', role_id: 1, status: 'bloqueado', email: 'otro@x.test' } })
comprueba('perfil put status', r.status, 200)
comprueba('perfil put mensaje', r.json.message, 'Perfil actualizado.')
comprueba('perfil put nombre', r.json.data?.full_name, 'Nombre Cambiado')
comprueba('perfil put NO escaló rol', r.json.data?.role, 'cliente')
comprueba('perfil put NO cambió estado', r.json.data?.status, 'activo')
comprueba('perfil put NO cambió email', r.json.data?.email, correo)

r = await pide('PUT', '/api/users/profile', { token: tokenCliente, cuerpo: { full_name: 'Nombre Cambiado', phone: '1'.repeat(21) } })
comprueba('perfil teléfono largo', r.status, 422)

// --- admin ------------------------------------------------------------------
r = await pide('GET', '/api/admin/users', { token: tokenCliente })
comprueba('admin con token cliente', r.status, 403)

const admin = await prisma.users.findFirst({ where: { role_id: 1, status: 'activo' } })
const { firmar } = await import(`file:///${base}/utils/jwt.js`)
const tokenAdmin = firmar({ id: admin.id, role: 'admin', email: admin.email })
console.log(`   admin de prueba: id=${admin.id} ${admin.email}`)
const cuantosAdmins = await prisma.users.count({ where: { role_id: 1, status: 'activo' } })
console.log(`   administradores activos: ${cuantosAdmins}`)

r = await pide('GET', '/api/admin/users', { token: tokenAdmin })
comprueba('admin listar status', r.status, 200)
comprueba('admin listar es array', Array.isArray(r.json.data), true)
comprueba('admin listar sin hash', r.json.data.some((u) => 'password_hash' in u), false)
console.log('   primer usuario:', JSON.stringify(r.json.data[0]))

r = await pide('PUT', `/api/admin/users/${idNuevo}/status`, { token: tokenAdmin, cuerpo: { status: 'activoo' } })
comprueba('estado inválido', r.status, 422)

r = await pide('PUT', `/api/admin/users/${idNuevo}/status`, { token: tokenAdmin, cuerpo: { status: 'bloqueado' } })
comprueba('estado ok status', r.status, 200)
comprueba('estado ok mensaje', r.json.message, 'Estado del usuario actualizado.')
comprueba('estado ok data', r.json.data, null)

r = await pide('PUT', `/api/admin/users/${admin.id}/status`, { token: tokenAdmin, cuerpo: { status: 'inactivo' } })
comprueba('admin auto-estado status', r.status, 409)
console.log('   mensaje:', r.json.message)

r = await pide('PUT', `/api/admin/users/${admin.id}/role`, { token: tokenAdmin, cuerpo: { role_id: 2 } })
comprueba('admin auto-rol status', r.status, 409)
console.log('   mensaje:', r.json.message)

r = await pide('DELETE', `/api/admin/users/${admin.id}`, { token: tokenAdmin })
comprueba('admin auto-borrado status', r.status, 409)
console.log('   mensaje:', r.json.message)

r = await pide('PUT', `/api/admin/users/${idNuevo}/role`, { token: tokenAdmin, cuerpo: { role_id: 9 } })
comprueba('rol inválido', r.status, 422)

r = await pide('PUT', `/api/admin/users/${idNuevo}/role`, { token: tokenAdmin, cuerpo: { role_id: 1 } })
comprueba('rol ok mensaje', r.json.message, 'Rol actualizado.')

// ahora idNuevo es admin pero bloqueado -> degradarlo NO debe chocar con la regla
r = await pide('PUT', `/api/admin/users/${idNuevo}/role`, { token: tokenAdmin, cuerpo: { role_id: 2 } })
comprueba('degradar admin no activo', r.status, 200)

r = await pide('PUT', '/api/admin/users/999999999/status', { token: tokenAdmin, cuerpo: { status: 'activo' } })
comprueba('usuario inexistente', r.status, 404)
comprueba('usuario inexistente mensaje', r.json.message, 'El usuario no existe.')

r = await pide('PUT', '/api/admin/users/abc/status', { token: tokenAdmin, cuerpo: { status: 'activo' } })
comprueba('id no numérico', r.status, 422)

// borrado de un usuario CON pedidos
const conPedidos = await prisma.orders.findFirst({ select: { user_id: true } })
if (conPedidos) {
  r = await pide('DELETE', `/api/admin/users/${conPedidos.user_id}`, { token: tokenAdmin })
  comprueba('borrar con pedidos status', r.status, 409)
  comprueba('borrar con pedidos mensaje', r.json.message, 'No se puede eliminar: el usuario tiene pedidos registrados.')
} else {
  console.log('   (sin pedidos en la BD: no se pudo probar el RESTRICT)')
}

r = await pide('DELETE', `/api/admin/users/${idNuevo}`, { token: tokenAdmin })
comprueba('borrar status', r.status, 200)
comprueba('borrar mensaje', r.json.message, 'Usuario eliminado.')

const quedan = await prisma.users.findUnique({ where: { id: BigInt(idNuevo) } })
comprueba('borrado de verdad', quedan, null)

// limpieza por si algo falló antes del DELETE
await prisma.users.deleteMany({ where: { email: correo } })

console.log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} FALLOS`}`)
servidor.close()
await prisma.$disconnect()
process.exit(fallos === 0 ? 0 : 1)
