-- =====================================================================
-- 003 — Los iconos de categoría dejan de ser emojis
-- =====================================================================
-- Motivo: cada sistema operativo dibuja los emojis con un estilo distinto,
-- no combinan con el resto de la interfaz y fueron lo primero que se rompió
-- al cargar el seed con una codificación equivocada.
--
-- Ahora `categories.icon` guarda el NOMBRE del icono (p. ej. 'zapatilla'),
-- que el frontend resuelve a un componente de Phosphor Icons en
-- ecommerce/src/components/CategoriaIcono.jsx
--
-- Aplicar SOLO sobre una base ya cargada con el seed antiguo. Una instalación
-- nueva ya no lo necesita: 001 crea la columna ancha y 002 siembra los nombres.
-- =====================================================================

BEGIN;

-- Los nombres no caben en los 10 caracteres originales.
ALTER TABLE categories ALTER COLUMN icon TYPE VARCHAR(40);

UPDATE categories SET icon = 'polo'       WHERE slug = 'polos';
UPDATE categories SET icon = 'pantalon'   WHERE slug = 'pantalones';
UPDATE categories SET icon = 'zapatilla'  WHERE slug = 'zapatillas';
UPDATE categories SET icon = 'casaca'     WHERE slug = 'casacas';
UPDATE categories SET icon = 'gorra'      WHERE slug = 'gorras';
UPDATE categories SET icon = 'mochila'    WHERE slug = 'mochilas';
UPDATE categories SET icon = 'reloj'      WHERE slug = 'relojes';
UPDATE categories SET icon = 'lentes'     WHERE slug = 'lentes';
UPDATE categories SET icon = 'accesorio'  WHERE slug = 'accesorios';

-- Cualquier categoría creada a mano que siga con un emoji (o vacía) pasa al
-- icono genérico, para que la interfaz nunca quede sin nada que pintar.
UPDATE categories
   SET icon = 'generico'
 WHERE icon IS NULL
    OR icon !~ '^[a-z]+$';

COMMIT;
