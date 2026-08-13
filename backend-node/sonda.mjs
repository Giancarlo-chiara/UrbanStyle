import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const p = await prisma.products.findFirst({ where: { id: 1n } })

console.log('--- tipos que devuelve Prisma ---')
for (const k of ['id', 'price', 'final_price', 'rating_count', 'is_featured', 'created_at']) {
  const v = p[k]
  console.log(`  ${k.padEnd(16)} ${(v?.constructor?.name ?? typeof v).padEnd(10)} ${String(v)}`)
}

console.log('\n--- JSON.stringify de un Decimal ---')
console.log('  ', JSON.stringify({ price: p.price, final: p.final_price }))

console.log('\n--- JSON.stringify de un BigInt ---')
try {
  console.log('  ', JSON.stringify({ id: p.id }))
} catch (e) {
  console.log('   LANZA:', e.message)
}

console.log('\n--- Date por defecto ---')
console.log('  ', JSON.stringify({ created_at: p.created_at }))

console.log('\n--- $queryRaw: mismos tipos? ---')
const filas = await prisma.$queryRaw`
  SELECT p.id, p.price, p.final_price, p.rating_count, p.is_featured, p.created_at
  FROM products p WHERE p.id = 1`
const f = filas[0]
for (const k of Object.keys(f)) {
  const v = f[k]
  console.log(`  ${k.padEnd(16)} ${(v?.constructor?.name ?? typeof v).padEnd(10)} ${String(v)}`)
}

await prisma.$disconnect()
