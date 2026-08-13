import { PrismaClient } from '@prisma/client'

/**
 * Cliente único de Prisma.
 *
 * Se guarda en `globalThis` a propósito. En desarrollo, `node --watch` recarga
 * el módulo en cada cambio y sin esto se abriría una conexión nueva cada vez
 * hasta agotar el límite de PostgreSQL. En Vercel el motivo es el mismo por otra
 * razón: cada invocación *en frío* crea una instancia, pero las invocaciones
 * *calientes* reutilizan el proceso, así que conviene que reutilicen el cliente.
 *
 * Al desplegar hay que usar además la cadena de conexión AGRUPADA (pooler) del
 * proveedor —Neon o Supabase la ofrecen—, porque un entorno sin servidor puede
 * abrir muchas conexiones simultáneas y PostgreSQL tiene un tope.
 */
const globalParaPrisma = globalThis

export const prisma =
  globalParaPrisma.prismaUrbanStyle ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalParaPrisma.prismaUrbanStyle = prisma
}

export default prisma
