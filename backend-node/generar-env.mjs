/**
 * Genera backend-node/.env reutilizando las credenciales que ya están en
 * backend/.env (el del backend PHP), para no tener que volver a escribirlas
 * ni mostrarlas por pantalla.
 *
 *   node generar-env.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'

const aqui = dirname(fileURLToPath(import.meta.url))
const origen = join(aqui, '..', 'backend', '.env')
const destino = join(aqui, '.env')

if (!existsSync(origen)) {
  console.error(`No encuentro ${origen}. Ejecuta primero setup-db.ps1.`)
  process.exit(1)
}

const leer = (texto) =>
  Object.fromEntries(
    texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => {
        const [k, ...resto] = l.split('=')
        return [k.trim(), resto.join('=').trim().replace(/^["'](.*)["']$/, '$1')]
      })
  )

const v = leer(readFileSync(origen, 'utf8'))

const usuario = encodeURIComponent(v.DB_USERNAME ?? 'postgres')
const clave = encodeURIComponent(v.DB_PASSWORD ?? '')
const host = v.DB_HOST ?? '127.0.0.1'
const puerto = v.DB_PORT ?? '5432'
const base = v.DB_DATABASE ?? 'urbanstyle'

// Si el .env del PHP no traía JWT_SECRET, se genera uno nuevo en lugar de
// caer en un valor por defecto conocido.
const jwt = v.JWT_SECRET && v.JWT_SECRET.length > 20 ? v.JWT_SECRET : randomBytes(48).toString('base64')

writeFileSync(
  destino,
  `# Generado por generar-env.mjs a partir de backend/.env — NO subir al repositorio
DATABASE_URL="postgresql://${usuario}:${clave}@${host}:${puerto}/${base}?schema=public"

JWT_SECRET="${jwt}"
JWT_EXPIRES_IN="7d"

PORT=8000
CORS_ALLOWED_ORIGIN="${v.CORS_ALLOWED_ORIGIN ?? 'http://localhost:5173'}"
NODE_ENV="development"
`,
  'utf8'
)

// Prisma CLI también se invoca desde la RAÍZ del repositorio (es lo que hace el
// build de Vercel), y allí no ve el .env de backend-node. Se escribe una copia
// con solo la URL de la base. Ambos están en .gitignore.
writeFileSync(
  join(aqui, '..', '.env'),
  `# Generado por backend-node/generar-env.mjs — NO subir al repositorio.
# Solo lo usa la CLI de Prisma cuando se ejecuta desde la raíz.
DATABASE_URL="postgresql://${usuario}:${clave}@${host}:${puerto}/${base}?schema=public"
`,
  'utf8'
)

// Se confirma que quedó bien SIN imprimir la contraseña.
console.log('backend-node/.env y .env (raíz) creados')
console.log(`  base de datos : ${base} en ${host}:${puerto}`)
console.log(`  usuario       : ${v.DB_USERNAME}`)
console.log(`  contraseña    : ${clave ? '(tomada de backend/.env)' : '(VACÍA — revisa backend/.env)'}`)
console.log(`  JWT_SECRET    : ${jwt === v.JWT_SECRET ? 'reutilizado del PHP' : 'generado nuevo'}`)
