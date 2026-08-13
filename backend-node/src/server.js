import 'dotenv/config'
import app from './app.js'
import prisma from './config/prisma.js'

/**
 * Arranque para desarrollo local. En Vercel este archivo NO se usa: allí se
 * exporta la app como función serverless y la plataforma la invoca, así que
 * nunca hay un `listen`.
 */
const puerto = Number(process.env.PORT || 8000)

const servidor = app.listen(puerto, () => {
  console.log(`UrbanStyle API (Node + Express + Prisma) en http://localhost:${puerto}/api`)
})

const apagar = async (senal) => {
  console.log(`\n${senal} recibido, cerrando...`)
  servidor.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => apagar('SIGINT'))
process.on('SIGTERM', () => apagar('SIGTERM'))
