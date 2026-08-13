import {
  TShirt, Pants, Hoodie, BaseballCap, Sneaker, Backpack,
  Watch, Sunglasses, Belt, Handbag, Boot, Beanie, Dress, Tag,
} from '@phosphor-icons/react'

/**
 * Iconos de categoría.
 *
 * Antes cada categoría guardaba un EMOJI en `categories.icon`. Se cambió porque:
 *   - cada sistema operativo dibuja los emojis distinto,
 *   - no comparten estilo con los iconos del resto de la interfaz,
 *   - y fueron justo lo que se rompió al cargar el seed con la codificación errónea.
 *
 * Se eligió **Phosphor** (`@phosphor-icons/react`, MIT) porque es la única
 * librería libre con vocabulario real de moda: `Pants`, `Sneaker`, `BaseballCap`
 * y `Hoodie` no existen en lucide (la que usa el resto de la interfaz) ni en
 * Tabler. Se usa el peso `regular`, de trazo fino, para las nueve categorías.
 *
 * La columna guarda el NOMBRE del icono (p. ej. 'zapatilla') y aquí se resuelve
 * al componente. La categoría sigue siendo un dato de la base de datos: el
 * administrador elige el icono desde el panel, no está cableado por slug.
 */

/** Peso de trazo de Phosphor: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'. */
export const PESO_ICONO = 'regular'

/**
 * Catálogo de iconos disponibles. La clave es lo que se guarda en
 * `categories.icon`; la etiqueta es lo que ve el administrador en el panel.
 */
export const ICONOS_CATEGORIA = {
  polo: { etiqueta: 'Polo / camiseta', Icono: TShirt },
  pantalon: { etiqueta: 'Pantalón', Icono: Pants },
  casaca: { etiqueta: 'Casaca / hoodie', Icono: Hoodie },
  gorra: { etiqueta: 'Gorra', Icono: BaseballCap },
  zapatilla: { etiqueta: 'Zapatilla', Icono: Sneaker },
  bota: { etiqueta: 'Bota', Icono: Boot },
  mochila: { etiqueta: 'Mochila', Icono: Backpack },
  bolso: { etiqueta: 'Bolso', Icono: Handbag },
  reloj: { etiqueta: 'Reloj', Icono: Watch },
  lentes: { etiqueta: 'Lentes', Icono: Sunglasses },
  gorro: { etiqueta: 'Gorro', Icono: Beanie },
  vestido: { etiqueta: 'Vestido', Icono: Dress },
  accesorio: { etiqueta: 'Accesorio', Icono: Belt },
  generico: { etiqueta: 'Genérico', Icono: Tag },
}

export const NOMBRES_ICONO = Object.keys(ICONOS_CATEGORIA)

/**
 * Pinta el icono de una categoría a partir del nombre guardado en la base.
 * Si el nombre no existe (o la base todavía guarda un emoji antiguo), cae en
 * el icono genérico en lugar de romper la vista.
 */
export default function CategoriaIcono({ nombre, size = 20, className, ...props }) {
  const { Icono } = ICONOS_CATEGORIA[nombre] ?? ICONOS_CATEGORIA.generico
  return (
    <Icono
      size={size}
      weight={PESO_ICONO}
      className={className}
      aria-hidden="true"
      {...props}
    />
  )
}
