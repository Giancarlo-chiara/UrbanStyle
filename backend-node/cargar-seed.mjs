/**
 * Carga el catálogo inicial en la base apuntada por DATABASE_URL.
 *
 *   $env:DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require"
 *   node backend-node/cargar-seed.mjs
 *
 * Se ejecuta por Prisma y no con `psql` a propósito: psql en Windows toma
 * `client_encoding` de la consola (WIN-1252 en un sistema en español), lee los
 * bytes UTF-8 del archivo como Latin-1 y los vuelve a codificar. El resultado es
 * que "Pantalón" se guarda mal y toda la tienda muestra los acentos rotos, sin
 * que la carga dé ningún error. Prisma envía siempre en UTF-8.
 */
import 'dotenv/config'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const aqui = dirname(fileURLToPath(import.meta.url))
const seed = join(aqui, '..', 'database', 'seeders', '002_seed_data.sql')

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Defínela antes de ejecutar este script.')
  process.exit(1)
}
if (!existsSync(seed)) {
  console.error(`No encuentro el seed en ${seed}`)
  process.exit(1)
}

const sql = readFileSync(seed, 'utf8')

const destino = process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, '://***@')
console.log(`Cargando el seed en ${destino}`)

const prisma = new PrismaClient()

// Con --si-vacia, encontrar la base ya cargada NO es un error: simplemente no
// hace nada y termina bien. Así el script puede correr en cada despliegue de
// Vercel sin romper el build: carga el catálogo la primera vez y se aparta las
// siguientes.
const soloSiVacia = process.argv.includes('--si-vacia')

try {
  const [{ count }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM products`
  if (count > 0) {
    const aviso = `La base ya tiene ${count} productos; no se recarga el seed.`
    if (soloSiVacia) {
      console.log(aviso)
      await prisma.$disconnect()
      process.exit(0)
    }
    console.error(
      `\n${aviso}\nEl seed NO es idempotente: volver a ejecutarlo fallaría por claves\n` +
      `duplicadas. Vacía las tablas primero si de verdad quieres recargarlo.`
    )
    process.exit(1)
  }

  // El archivo ya viene envuelto en BEGIN/COMMIT, así que se ejecuta entero:
  // o entra todo o no entra nada.
  await prisma.$executeRawUnsafe(sql)

  const resumen = await prisma.$queryRaw`
    SELECT 'categorías' AS tabla, COUNT(*)::int AS filas FROM categories
    UNION ALL SELECT 'marcas',      COUNT(*)::int FROM brands
    UNION ALL SELECT 'productos',   COUNT(*)::int FROM products
    UNION ALL SELECT 'variantes',   COUNT(*)::int FROM product_variants
    UNION ALL SELECT 'imágenes',    COUNT(*)::int FROM product_images
    UNION ALL SELECT 'usuarios',    COUNT(*)::int FROM users
    UNION ALL SELECT 'promociones', COUNT(*)::int FROM promotions`

  console.log('\nCargado:')
  for (const r of resumen) console.log(`  ${String(r.tabla).padEnd(12)} ${r.filas}`)

  // Comprobación de codificación: 'Única' ocupa 6 bytes en UTF-8 correcto y 8 si
  // entró doblemente codificada.
  const [{ bytes }] = await prisma.$queryRaw`
    SELECT octet_length(size) AS bytes FROM product_variants WHERE size LIKE '%nica' LIMIT 1`
  console.log(
    Number(bytes) === 6
      ? '\n  Codificación correcta (acentos y emojis bien guardados).'
      : `\n  AVISO: 'Única' ocupa ${bytes} bytes (deberían ser 6). Codificación incorrecta.`
  )

  console.log('\nAdmin de prueba: admin@urbanstyle.pe / Admin123!  — cámbialo cuanto antes.')
} catch (e) {
  console.error('\nFalló la carga:', e.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
