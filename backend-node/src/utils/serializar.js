import { Prisma } from '@prisma/client'

/**
 * Adapta lo que devuelve Prisma al MISMO JSON que producía la API en PHP, para
 * que el frontend no necesite ni un cambio.
 *
 * Tres diferencias reales, medidas contra la API antigua:
 *
 *   1. Los identificadores son BIGINT en PostgreSQL. Prisma los entrega como
 *      `BigInt` de JavaScript, y `JSON.stringify` LANZA una excepción con ellos
 *      ("Do not know how to serialize a BigInt"). PDO los entregaba como número.
 *      → se convierten a número.
 *
 *   2. Los importes son NUMERIC(10,2). Prisma los entrega como `Decimal`, cuyo
 *      `toJSON` devuelve "349.9" (pierde el cero final). PDO devolvía "349.90".
 *      → se formatean siempre con dos decimales, como cadena. Se mantiene la
 *        cadena a propósito: `float` no representa dinero de forma exacta, y el
 *        frontend ya hace `Number(...)` donde lo necesita.
 *
 *   3. Las fechas son TIMESTAMPTZ. PDO devolvía el texto crudo de PostgreSQL
 *      ("2026-08-12 22:13:44.309709-05"); aquí se emiten en ISO 8601
 *      ("2026-08-13T03:13:44.309Z"). Es un cambio DELIBERADO: ISO es el estándar
 *      y `new Date()` lo interpreta igual en todos los navegadores. Verificado
 *      que las tres vistas que leen fechas (tarjeta de producto, pedidos y
 *      bitácora de inventario) funcionan con ambos formatos.
 */

/** Columnas que deben viajar como cadena con dos decimales. */
const CAMPOS_IMPORTE = new Set([
  'price',
  'discount_percent',
  'final_price',
  'rating_avg',
  'subtotal',
  'discount_total',
  'shipping_cost',
  'total',
  'unit_price',
  'discount_amount',
])

const esDecimal = (v) => Prisma.Decimal.isDecimal(v)

/**
 * Recorre el valor en profundidad y devuelve una copia lista para JSON.
 * @param {unknown} valor
 * @param {string|null} clave Nombre de la columna, para saber si es importe.
 */
export function serializar(valor, clave = null) {
  if (valor === null || valor === undefined) return null

  if (typeof valor === 'bigint') return Number(valor)

  if (esDecimal(valor)) {
    return CAMPOS_IMPORTE.has(clave) ? valor.toFixed(2) : valor.toString()
  }

  if (valor instanceof Date) return valor.toISOString()

  if (Array.isArray(valor)) return valor.map((v) => serializar(v, clave))

  if (typeof valor === 'object') {
    const salida = {}
    for (const [k, v] of Object.entries(valor)) {
      salida[k] = serializar(v, k)
    }
    return salida
  }

  // OJO: aquí NO se formatean los números normales aunque el nombre del campo
  // esté en CAMPOS_IMPORTE. Hacerlo rompía `pagination.total`, que es un CONTEO
  // (36) y comparte nombre con el `total` de un pedido, que sí es dinero: salía
  // como "36.00" en lugar de 36. El formato de dos decimales solo tiene sentido
  // para los `Decimal` que vienen de columnas NUMERIC, que es donde vive el
  // dinero de verdad.
  return valor
}

export default serializar
