/**
 * Generador de slugs, único para todo el proyecto.
 *
 * En PHP había TRES implementaciones distintas e incompatibles: CategoryService
 * normalizaba los acentos con un mapa, BrandService no los normalizaba (así que
 * "Adidas Perú" acababa como "adidas-per") y ProductService añadía además un
 * sufijo. Aquí hay una sola base compartida; quien necesite un sufijo lo compone
 * sobre `slugificar`.
 *
 * Diferencia deliberada con el original: se pasa a minúsculas ANTES de aplicar el
 * mapa. `strtolower` de PHP trabaja byte a byte y no convertía 'Á' en 'á', de modo
 * que un nombre escrito en mayúsculas perdía la vocal acentuada entera ("ÁRBOL"
 * daba "rbol"). `toLowerCase` de JavaScript sí entiende Unicode.
 */

const MAPA_ACENTOS = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n',
}

export function slugificar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .replace(/[áéíóúñ]/g, (c) => MAPA_ACENTOS[c])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default slugificar
