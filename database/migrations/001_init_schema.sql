-- =====================================================================
-- UrbanStyle — Esquema de Base de Datos (PostgreSQL)
-- =====================================================================
-- Convenciones:
--   - Todas las tablas usan id BIGSERIAL como PK.
--   - Timestamps en UTC (timestamptz).
--   - Nombres en snake_case, en español donde no choque con estándares.
--   - Claves foráneas con ON DELETE explícito según la relación.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- para gen_random_uuid() si se necesitara

-- ---------------------------------------------------------------------
-- Función genérica para mantener columna updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- USUARIOS Y ROLES
-- =====================================================================
CREATE TABLE roles (
  id          SMALLSERIAL PRIMARY KEY,
  name        VARCHAR(30) NOT NULL UNIQUE -- 'admin' | 'cliente'
);

INSERT INTO roles (name) VALUES ('admin'), ('cliente');

CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  role_id        SMALLINT NOT NULL REFERENCES roles(id) DEFAULT 2,
  full_name      VARCHAR(150) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(20),
  status         VARCHAR(20) NOT NULL DEFAULT 'activo', -- activo | inactivo | bloqueado
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE addresses (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name VARCHAR(150) NOT NULL,
  address_line  VARCHAR(255) NOT NULL,
  district      VARCHAR(100),
  city          VARCHAR(100) NOT NULL,
  region        VARCHAR(100),
  postal_code   VARCHAR(20),
  country       VARCHAR(80) NOT NULL DEFAULT 'Perú',
  phone         VARCHAR(20),
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user ON addresses(user_id);

-- =====================================================================
-- CATÁLOGO: MARCAS, CATEGORÍAS, PRODUCTOS
-- =====================================================================
CREATE TABLE brands (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  logo_url    VARCHAR(500),
  status      VARCHAR(20) NOT NULL DEFAULT 'activo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorías con soporte de subcategorías vía parent_id (self-reference)
CREATE TABLE categories (
  id          BIGSERIAL PRIMARY KEY,
  parent_id   BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  icon        VARCHAR(40), -- nombre del icono mostrado en la UI (ver ecommerce/src/components/CategoriaIcono.jsx)
  status      VARCHAR(20) NOT NULL DEFAULT 'activo',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TABLE products (
  id               BIGSERIAL PRIMARY KEY,
  category_id      BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subcategory_id   BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  brand_id         BIGINT NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  name             VARCHAR(200) NOT NULL,
  slug             VARCHAR(220) NOT NULL UNIQUE,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  -- precio_final calculado automáticamente por PostgreSQL (columna generada)
  final_price      NUMERIC(10,2) GENERATED ALWAYS AS (
                      ROUND(price - (price * discount_percent / 100), 2)
                   ) STORED,
  status           VARCHAR(20) NOT NULL DEFAULT 'activo', -- activo | inactivo | agotado
  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg       NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count     INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_trgm ON products USING gin (to_tsvector('spanish', name));

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Múltiples imágenes por producto
CREATE TABLE product_images (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- Variantes: combinación de talla + color con stock propio
CREATE TABLE product_variants (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        VARCHAR(20) NOT NULL DEFAULT 'Única',
  color       VARCHAR(40) NOT NULL DEFAULT 'Estándar',
  sku         VARCHAR(80) UNIQUE,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, size, color)
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

CREATE TABLE product_reviews (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX idx_reviews_product ON product_reviews(product_id);

-- =====================================================================
-- FAVORITOS
-- =====================================================================
CREATE TABLE favorites (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- =====================================================================
-- CARRITO PERSISTENTE (opcional, respaldo del carrito en cliente)
-- =====================================================================
CREATE TABLE carts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id          BIGSERIAL PRIMARY KEY,
  cart_id     BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id  BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (cart_id, variant_id)
);

-- =====================================================================
-- PEDIDOS
-- =====================================================================
CREATE TABLE orders (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  address_id      BIGINT REFERENCES addresses(id) ON DELETE SET NULL,
  subtotal        NUMERIC(10,2) NOT NULL,
  discount_total  NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_cost   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  -- pendiente | pagado | procesando | enviado | entregado | cancelado
  payment_method  VARCHAR(40) NOT NULL DEFAULT 'tarjeta',
  promotion_code  VARCHAR(40),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE order_items (
  id                  BIGSERIAL PRIMARY KEY,
  order_id            BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id          BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id          BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(200) NOT NULL, -- por si el producto cambia luego
  unit_price          NUMERIC(10,2) NOT NULL,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  subtotal            NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_status_history (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      VARCHAR(30) NOT NULL,
  note        VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- INVENTARIO (auditoría de movimientos de stock)
-- =====================================================================
CREATE TABLE inventory_movements (
  id          BIGSERIAL PRIMARY KEY,
  variant_id  BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL, -- entrada | salida | ajuste
  quantity    INTEGER NOT NULL,
  reason      VARCHAR(255),
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inventory_variant ON inventory_movements(variant_id);

-- =====================================================================
-- PROMOCIONES
-- =====================================================================
CREATE TABLE promotions (
  id                BIGSERIAL PRIMARY KEY,
  code              VARCHAR(40) NOT NULL UNIQUE,
  description       VARCHAR(255),
  discount_percent  NUMERIC(5,2) CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount   NUMERIC(10,2),
  applies_to        VARCHAR(20) NOT NULL DEFAULT 'todo', -- todo | categoria | producto
  category_id       BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  product_id        BIGINT REFERENCES products(id) ON DELETE CASCADE,
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
