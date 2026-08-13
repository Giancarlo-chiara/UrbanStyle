BEGIN;

-- Categorías principales
-- `icon` guarda el NOMBRE del icono, no un emoji: los emojis se cambiaron porque
-- cada sistema operativo los dibuja distinto y no combinan con el resto de la
-- interfaz. Los nombres válidos están en ecommerce/src/components/CategoriaIcono.jsx
INSERT INTO categories (name, slug, icon) VALUES
('Polos', 'polos', 'polo'),
('Pantalones', 'pantalones', 'pantalon'),
('Zapatillas', 'zapatillas', 'zapatilla'),
('Casacas', 'casacas', 'casaca'),
('Gorras', 'gorras', 'gorra'),
('Mochilas', 'mochilas', 'mochila'),
('Relojes', 'relojes', 'reloj'),
('Lentes', 'lentes', 'lentes'),
('Accesorios', 'accesorios', 'accesorio');

-- Marcas
INSERT INTO brands (name, slug) VALUES
('Nike', 'nike'),
('Adidas', 'adidas'),
('Puma', 'puma'),
('Levis', 'levis'),
('Zara', 'zara'),
('H&M', 'h-m');

-- Usuario administrador (password: Admin123! -- hash bcrypt de ejemplo, cambiar en producción)
-- El hash corresponde a 'Admin123!' generado con password_hash() de PHP (bcrypt)
INSERT INTO users (role_id, full_name, email, password_hash, status) VALUES
(1, 'Administrador UrbanStyle', 'admin@urbanstyle.pe', '$2y$10$AfKqcKHYXJbH0H1T6ITaEO3Zw/J9CBQ/WiuNy2RGJVowHwQ6fkqv2', 'activo');

-- Productos, imágenes y variantes generados a partir del catálogo original
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (1, (SELECT id FROM categories WHERE slug='zapatillas'), (SELECT id FROM brands WHERE slug='nike'), 'Air Force 1 Classic', 'air-force-1-classic-1', 'Air Force 1 Classic de Nike. Prenda/accesorio de la categoría Zapatillas, ideal para looks urbanos modernos.', 349.9, 18.61, 'activo', FALSE, 4.8, 124);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (1, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (1, '38', 'Estándar', 'SKU-1-38', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (1, '39', 'Estándar', 'SKU-1-39', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (1, '40', 'Estándar', 'SKU-1-40', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (1, '41', 'Estándar', 'SKU-1-41', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (1, '42', 'Estándar', 'SKU-1-42', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (1, '43', 'Estándar', 'SKU-1-43', 2);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (7, (SELECT id FROM categories WHERE slug='zapatillas'), (SELECT id FROM brands WHERE slug='adidas'), 'Ultraboost Running', 'ultraboost-running-7', 'Ultraboost Running de Adidas. Prenda/accesorio de la categoría Zapatillas, ideal para looks urbanos modernos.', 459.9, 13.21, 'activo', TRUE, 4.9, 312);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (7, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (7, '38', 'Estándar', 'SKU-7-38', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (7, '39', 'Estándar', 'SKU-7-39', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (7, '40', 'Estándar', 'SKU-7-40', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (7, '41', 'Estándar', 'SKU-7-41', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (7, '42', 'Estándar', 'SKU-7-42', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (7, '43', 'Estándar', 'SKU-7-43', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (7, '44', 'Estándar', 'SKU-7-44', 1);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (12, (SELECT id FROM categories WHERE slug='zapatillas'), (SELECT id FROM brands WHERE slug='puma'), 'RS-X Bold', 'rs-x-bold-12', 'RS-X Bold de Puma. Prenda/accesorio de la categoría Zapatillas, ideal para looks urbanos modernos.', 389.9, 13.34, 'activo', TRUE, 4.6, 166);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (12, 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (12, '38', 'Estándar', 'SKU-12-38', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (12, '39', 'Estándar', 'SKU-12-39', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (12, '40', 'Estándar', 'SKU-12-40', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (12, '41', 'Estándar', 'SKU-12-41', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (12, '42', 'Estándar', 'SKU-12-42', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (12, '43', 'Estándar', 'SKU-12-43', 1);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (13, (SELECT id FROM categories WHERE slug='zapatillas'), (SELECT id FROM brands WHERE slug='nike'), 'Air Max 270', 'air-max-270-13', 'Air Max 270 de Nike. Prenda/accesorio de la categoría Zapatillas, ideal para looks urbanos modernos.', 499.9, 13.8, 'activo', TRUE, 4.7, 245);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (13, 'https://images.unsplash.com/photo-1605408499391-6368c628ef42?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (13, '38', 'Estándar', 'SKU-13-38', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (13, '39', 'Estándar', 'SKU-13-39', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (13, '40', 'Estándar', 'SKU-13-40', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (13, '41', 'Estándar', 'SKU-13-41', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (13, '42', 'Estándar', 'SKU-13-42', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (13, '43', 'Estándar', 'SKU-13-43', 1);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (13, '44', 'Estándar', 'SKU-13-44', 1);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (14, (SELECT id FROM categories WHERE slug='zapatillas'), (SELECT id FROM brands WHERE slug='adidas'), 'Stan Smith Clásico', 'stan-smith-clasico-14', 'Stan Smith Clásico de Adidas. Prenda/accesorio de la categoría Zapatillas, ideal para looks urbanos modernos.', 299.9, 0, 'activo', TRUE, 4.5, 189);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (14, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (14, '37', 'Estándar', 'SKU-14-37', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (14, '38', 'Estándar', 'SKU-14-38', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (14, '39', 'Estándar', 'SKU-14-39', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (14, '40', 'Estándar', 'SKU-14-40', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (14, '41', 'Estándar', 'SKU-14-41', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (14, '42', 'Estándar', 'SKU-14-42', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (14, '43', 'Estándar', 'SKU-14-43', 2);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (15, (SELECT id FROM categories WHERE slug='zapatillas'), (SELECT id FROM brands WHERE slug='puma'), 'Suede Classic XXI', 'suede-classic-xxi-15', 'Suede Classic XXI de Puma. Prenda/accesorio de la categoría Zapatillas, ideal para looks urbanos modernos.', 279.9, 12.5, 'activo', FALSE, 4.4, 98);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (15, 'https://images.unsplash.com/photo-1584735175315-9d5df23be2f5?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (15, '38', 'Estándar', 'SKU-15-38', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (15, '39', 'Estándar', 'SKU-15-39', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (15, '40', 'Estándar', 'SKU-15-40', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (15, '41', 'Estándar', 'SKU-15-41', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (15, '42', 'Estándar', 'SKU-15-42', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (15, '43', 'Estándar', 'SKU-15-43', 2);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (16, (SELECT id FROM categories WHERE slug='zapatillas'), (SELECT id FROM brands WHERE slug='zara'), 'Chuck Taylor All Star', 'chuck-taylor-all-star-16', 'Chuck Taylor All Star de Zara. Prenda/accesorio de la categoría Zapatillas, ideal para looks urbanos modernos.', 189.9, 0, 'activo', TRUE, 4.3, 312);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (16, 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '36', 'Estándar', 'SKU-16-36', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '37', 'Estándar', 'SKU-16-37', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '38', 'Estándar', 'SKU-16-38', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '39', 'Estándar', 'SKU-16-39', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '40', 'Estándar', 'SKU-16-40', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '41', 'Estándar', 'SKU-16-41', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '42', 'Estándar', 'SKU-16-42', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '43', 'Estándar', 'SKU-16-43', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (16, '44', 'Estándar', 'SKU-16-44', 3);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (2, (SELECT id FROM categories WHERE slug='polos'), (SELECT id FROM brands WHERE slug='zara'), 'Polo Oversize Essential', 'polo-oversize-essential-2', 'Polo Oversize Essential de Zara. Prenda/accesorio de la categoría Polos, ideal para looks urbanos modernos.', 89.9, 0, 'activo', FALSE, 4.5, 67);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (2, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (2, 'XS', 'Estándar', 'SKU-2-xs', 6);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (2, 'S', 'Estándar', 'SKU-2-s', 6);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (2, 'M', 'Estándar', 'SKU-2-m', 6);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (2, 'L', 'Estándar', 'SKU-2-l', 6);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (2, 'XL', 'Estándar', 'SKU-2-xl', 6);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (10, (SELECT id FROM categories WHERE slug='polos'), (SELECT id FROM brands WHERE slug='nike'), 'Polo Graphic Tee', 'polo-graphic-tee-10', 'Polo Graphic Tee de Nike. Prenda/accesorio de la categoría Polos, ideal para looks urbanos modernos.', 99.9, 23.09, 'activo', FALSE, 4.5, 145);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (10, 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (10, 'XS', 'Estándar', 'SKU-10-xs', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (10, 'S', 'Estándar', 'SKU-10-s', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (10, 'M', 'Estándar', 'SKU-10-m', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (10, 'L', 'Estándar', 'SKU-10-l', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (10, 'XL', 'Estándar', 'SKU-10-xl', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (10, 'XXL', 'Estándar', 'SKU-10-xxl', 3);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (17, (SELECT id FROM categories WHERE slug='polos'), (SELECT id FROM brands WHERE slug='h-m'), 'Polo Linen Basic', 'polo-linen-basic-17', 'Polo Linen Basic de H&M. Prenda/accesorio de la categoría Polos, ideal para looks urbanos modernos.', 69.9, 0, 'activo', FALSE, 4.2, 54);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (17, 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (17, 'XS', 'Estándar', 'SKU-17-xs', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (17, 'S', 'Estándar', 'SKU-17-s', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (17, 'M', 'Estándar', 'SKU-17-m', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (17, 'L', 'Estándar', 'SKU-17-l', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (17, 'XL', 'Estándar', 'SKU-17-xl', 6);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (17, 'XXL', 'Estándar', 'SKU-17-xxl', 6);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (18, (SELECT id FROM categories WHERE slug='polos'), (SELECT id FROM brands WHERE slug='levis'), 'Polo Stripe Vintage', 'polo-stripe-vintage-18', 'Polo Stripe Vintage de Levis. Prenda/accesorio de la categoría Polos, ideal para looks urbanos modernos.', 109.9, 21.44, 'activo', FALSE, 4.6, 87);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (18, 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (18, 'S', 'Estándar', 'SKU-18-s', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (18, 'M', 'Estándar', 'SKU-18-m', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (18, 'L', 'Estándar', 'SKU-18-l', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (18, 'XL', 'Estándar', 'SKU-18-xl', 4);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (19, (SELECT id FROM categories WHERE slug='polos'), (SELECT id FROM brands WHERE slug='zara'), 'Polo Slim Fit Premium', 'polo-slim-fit-premium-19', 'Polo Slim Fit Premium de Zara. Prenda/accesorio de la categoría Polos, ideal para looks urbanos modernos.', 119.9, 0, 'activo', FALSE, 4.7, 102);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (19, 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (19, 'XS', 'Estándar', 'SKU-19-xs', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (19, 'S', 'Estándar', 'SKU-19-s', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (19, 'M', 'Estándar', 'SKU-19-m', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (19, 'L', 'Estándar', 'SKU-19-l', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (19, 'XL', 'Estándar', 'SKU-19-xl', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (19, 'XXL', 'Estándar', 'SKU-19-xxl', 4);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (3, (SELECT id FROM categories WHERE slug='casacas'), (SELECT id FROM brands WHERE slug='h-m'), 'Casaca Bomber Urban', 'casaca-bomber-urban-3', 'Casaca Bomber Urban de H&M. Prenda/accesorio de la categoría Casacas, ideal para looks urbanos modernos.', 199.9, 23.09, 'activo', FALSE, 4.7, 89);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (3, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (3, 'S', 'Estándar', 'SKU-3-s', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (3, 'M', 'Estándar', 'SKU-3-m', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (3, 'L', 'Estándar', 'SKU-3-l', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (3, 'XL', 'Estándar', 'SKU-3-xl', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (3, 'XXL', 'Estándar', 'SKU-3-xxl', 2);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (11, (SELECT id FROM categories WHERE slug='casacas'), (SELECT id FROM brands WHERE slug='levis'), 'Casaca Denim', 'casaca-denim-11', 'Casaca Denim de Levis. Prenda/accesorio de la categoría Casacas, ideal para looks urbanos modernos.', 229.9, 0, 'activo', FALSE, 4.7, 78);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (11, 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (11, 'S', 'Estándar', 'SKU-11-s', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (11, 'M', 'Estándar', 'SKU-11-m', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (11, 'L', 'Estándar', 'SKU-11-l', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (11, 'XL', 'Estándar', 'SKU-11-xl', 3);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (20, (SELECT id FROM categories WHERE slug='casacas'), (SELECT id FROM brands WHERE slug='nike'), 'Casaca Puffer Invierno', 'casaca-puffer-invierno-20', 'Casaca Puffer Invierno de Nike. Prenda/accesorio de la categoría Casacas, ideal para looks urbanos modernos.', 349.9, 16.67, 'activo', FALSE, 4.8, 134);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (20, 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (20, 'S', 'Estándar', 'SKU-20-s', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (20, 'M', 'Estándar', 'SKU-20-m', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (20, 'L', 'Estándar', 'SKU-20-l', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (20, 'XL', 'Estándar', 'SKU-20-xl', 2);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (20, 'XXL', 'Estándar', 'SKU-20-xxl', 2);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (21, (SELECT id FROM categories WHERE slug='casacas'), (SELECT id FROM brands WHERE slug='adidas'), 'Windbreaker Ligero', 'windbreaker-ligero-21', 'Windbreaker Ligero de Adidas. Prenda/accesorio de la categoría Casacas, ideal para looks urbanos modernos.', 269.9, 0, 'activo', FALSE, 4.5, 63);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (21, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (21, 'XS', 'Estándar', 'SKU-21-xs', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (21, 'S', 'Estándar', 'SKU-21-s', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (21, 'M', 'Estándar', 'SKU-21-m', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (21, 'L', 'Estándar', 'SKU-21-l', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (21, 'XL', 'Estándar', 'SKU-21-xl', 3);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (22, (SELECT id FROM categories WHERE slug='casacas'), (SELECT id FROM brands WHERE slug='puma'), 'Hoodie Zip Urban', 'hoodie-zip-urban-22', 'Hoodie Zip Urban de Puma. Prenda/accesorio de la categoría Casacas, ideal para looks urbanos modernos.', 189.9, 17.4, 'activo', FALSE, 4.4, 91);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (22, 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (22, 'S', 'Estándar', 'SKU-22-s', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (22, 'M', 'Estándar', 'SKU-22-m', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (22, 'L', 'Estándar', 'SKU-22-l', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (22, 'XL', 'Estándar', 'SKU-22-xl', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (22, 'XXL', 'Estándar', 'SKU-22-xxl', 3);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (5, (SELECT id FROM categories WHERE slug='pantalones'), (SELECT id FROM brands WHERE slug='levis'), 'Jean Slim Fit', 'jean-slim-fit-5', 'Jean Slim Fit de Levis. Prenda/accesorio de la categoría Pantalones, ideal para looks urbanos modernos.', 179.9, 18.19, 'activo', TRUE, 4.4, 203);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (5, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (5, '28', 'Estándar', 'SKU-5-28', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (5, '30', 'Estándar', 'SKU-5-30', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (5, '32', 'Estándar', 'SKU-5-32', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (5, '34', 'Estándar', 'SKU-5-34', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (5, '36', 'Estándar', 'SKU-5-36', 5);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (23, (SELECT id FROM categories WHERE slug='pantalones'), (SELECT id FROM brands WHERE slug='nike'), 'Jogger Cargo Urban', 'jogger-cargo-urban-23', 'Jogger Cargo Urban de Nike. Prenda/accesorio de la categoría Pantalones, ideal para looks urbanos modernos.', 159.9, 0, 'activo', FALSE, 4.6, 77);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (23, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (23, 'S', 'Estándar', 'SKU-23-s', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (23, 'M', 'Estándar', 'SKU-23-m', 5);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (23, 'L', 'Estándar', 'SKU-23-l', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (23, 'XL', 'Estándar', 'SKU-23-xl', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (23, 'XXL', 'Estándar', 'SKU-23-xxl', 4);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (24, (SELECT id FROM categories WHERE slug='pantalones'), (SELECT id FROM brands WHERE slug='zara'), 'Pantalón Chino Slim', 'pantalon-chino-slim-24', 'Pantalón Chino Slim de Zara. Prenda/accesorio de la categoría Pantalones, ideal para looks urbanos modernos.', 139.9, 17.66, 'activo', FALSE, 4.3, 118);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (24, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (24, '28', 'Estándar', 'SKU-24-28', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (24, '30', 'Estándar', 'SKU-24-30', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (24, '32', 'Estándar', 'SKU-24-32', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (24, '34', 'Estándar', 'SKU-24-34', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (24, '36', 'Estándar', 'SKU-24-36', 3);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (24, '38', 'Estándar', 'SKU-24-38', 2);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (25, (SELECT id FROM categories WHERE slug='pantalones'), (SELECT id FROM brands WHERE slug='h-m'), 'Jean Wide Leg', 'jean-wide-leg-25', 'Jean Wide Leg de H&M. Prenda/accesorio de la categoría Pantalones, ideal para looks urbanos modernos.', 149.9, 0, 'activo', FALSE, 4.5, 89);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (25, 'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (25, '26', 'Estándar', 'SKU-25-26', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (25, '28', 'Estándar', 'SKU-25-28', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (25, '30', 'Estándar', 'SKU-25-30', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (25, '32', 'Estándar', 'SKU-25-32', 4);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (25, '34', 'Estándar', 'SKU-25-34', 4);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (4, (SELECT id FROM categories WHERE slug='mochilas'), (SELECT id FROM brands WHERE slug='adidas'), 'Mochila Urbana Pro', 'mochila-urbana-pro-4', 'Mochila Urbana Pro de Adidas. Prenda/accesorio de la categoría Mochilas, ideal para looks urbanos modernos.', 149.9, 0, 'activo', FALSE, 4.6, 45);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (4, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (4, 'Única', 'Estándar', 'SKU-4-unica', 20);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (26, (SELECT id FROM categories WHERE slug='mochilas'), (SELECT id FROM brands WHERE slug='nike'), 'Mochila Trekking 30L', 'mochila-trekking-30l-26', 'Mochila Trekking 30L de Nike. Prenda/accesorio de la categoría Mochilas, ideal para looks urbanos modernos.', 199.9, 20.01, 'activo', FALSE, 4.7, 112);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (26, 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (26, 'Única', 'Estándar', 'SKU-26-unica', 13);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (27, (SELECT id FROM categories WHERE slug='mochilas'), (SELECT id FROM brands WHERE slug='zara'), 'Mini Backpack Trendy', 'mini-backpack-trendy-27', 'Mini Backpack Trendy de Zara. Prenda/accesorio de la categoría Mochilas, ideal para looks urbanos modernos.', 99.9, 0, 'activo', FALSE, 4.4, 68);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (27, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (27, 'Única', 'Estándar', 'SKU-27-unica', 25);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (6, (SELECT id FROM categories WHERE slug='gorras'), (SELECT id FROM brands WHERE slug='puma'), 'Gorra Snapback Urban', 'gorra-snapback-urban-6', 'Gorra Snapback Urban de Puma. Prenda/accesorio de la categoría Gorras, ideal para looks urbanos modernos.', 59.9, 0, 'activo', FALSE, 4.3, 38);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (6, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (6, 'Única', 'Estándar', 'SKU-6-unica', 40);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (28, (SELECT id FROM categories WHERE slug='gorras'), (SELECT id FROM brands WHERE slug='nike'), 'Gorra Trucker Mesh', 'gorra-trucker-mesh-28', 'Gorra Trucker Mesh de Nike. Prenda/accesorio de la categoría Gorras, ideal para looks urbanos modernos.', 69.9, 22.25, 'activo', FALSE, 4.5, 74);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (28, 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (28, 'Única', 'Estándar', 'SKU-28-unica', 35);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (29, (SELECT id FROM categories WHERE slug='gorras'), (SELECT id FROM brands WHERE slug='h-m'), 'Bucket Hat Vintage', 'bucket-hat-vintage-29', 'Bucket Hat Vintage de H&M. Prenda/accesorio de la categoría Gorras, ideal para looks urbanos modernos.', 49.9, 0, 'activo', FALSE, 4.2, 52);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (29, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (29, 'S/M', 'Estándar', 'SKU-29-s-m', 15);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (29, 'L/XL', 'Estándar', 'SKU-29-l-xl', 15);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (8, (SELECT id FROM categories WHERE slug='relojes'), (SELECT id FROM brands WHERE slug='zara'), 'Reloj Minimalista', 'reloj-minimalista-8', 'Reloj Minimalista de Zara. Prenda/accesorio de la categoría Relojes, ideal para looks urbanos modernos.', 249.9, 0, 'agotado', FALSE, 4.6, 57);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (8, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (8, 'Única', 'Estándar', 'SKU-8-unica', 0);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (30, (SELECT id FROM categories WHERE slug='relojes'), (SELECT id FROM brands WHERE slug='nike'), 'Smartwatch Sport Pro', 'smartwatch-sport-pro-30', 'Smartwatch Sport Pro de Nike. Prenda/accesorio de la categoría Relojes, ideal para looks urbanos modernos.', 549.9, 15.39, 'activo', TRUE, 4.8, 198);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (30, 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (30, 'Única', 'Estándar', 'SKU-30-unica', 7);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (31, (SELECT id FROM categories WHERE slug='relojes'), (SELECT id FROM brands WHERE slug='adidas'), 'Reloj Cronógrafo Urban', 'reloj-cronografo-urban-31', 'Reloj Cronógrafo Urban de Adidas. Prenda/accesorio de la categoría Relojes, ideal para looks urbanos modernos.', 329.9, 0, 'activo', FALSE, 4.5, 83);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (31, 'https://images.unsplash.com/photo-1509941943102-10c232535736?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (31, 'Única', 'Estándar', 'SKU-31-unica', 12);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (9, (SELECT id FROM categories WHERE slug='lentes'), (SELECT id FROM brands WHERE slug='h-m'), 'Lentes Wayfarer', 'lentes-wayfarer-9', 'Lentes Wayfarer de H&M. Prenda/accesorio de la categoría Lentes, ideal para looks urbanos modernos.', 79.9, 20.02, 'activo', FALSE, 4.2, 91);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (9, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (9, 'Única', 'Estándar', 'SKU-9-unica', 18);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (32, (SELECT id FROM categories WHERE slug='lentes'), (SELECT id FROM brands WHERE slug='zara'), 'Lentes Aviator Gold', 'lentes-aviator-gold-32', 'Lentes Aviator Gold de Zara. Prenda/accesorio de la categoría Lentes, ideal para looks urbanos modernos.', 119.9, 0, 'activo', FALSE, 4.6, 64);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (32, 'https://images.unsplash.com/photo-1473496169904-658ba7574b44?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (32, 'Única', 'Estándar', 'SKU-32-unica', 22);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (33, (SELECT id FROM categories WHERE slug='lentes'), (SELECT id FROM brands WHERE slug='nike'), 'Lentes Sport Shield', 'lentes-sport-shield-33', 'Lentes Sport Shield de Nike. Prenda/accesorio de la categoría Lentes, ideal para looks urbanos modernos.', 149.9, 16.68, 'activo', FALSE, 4.7, 47);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (33, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (33, 'Única', 'Estándar', 'SKU-33-unica', 15);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (34, (SELECT id FROM categories WHERE slug='accesorios'), (SELECT id FROM brands WHERE slug='levis'), 'Cinturón Cuero Urban', 'cinturon-cuero-urban-34', 'Cinturón Cuero Urban de Levis. Prenda/accesorio de la categoría Accesorios, ideal para looks urbanos modernos.', 89.9, 0, 'activo', FALSE, 4.4, 39);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (34, 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (34, 'S', 'Estándar', 'SKU-34-s', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (34, 'M', 'Estándar', 'SKU-34-m', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (34, 'L', 'Estándar', 'SKU-34-l', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (34, 'XL', 'Estándar', 'SKU-34-xl', 7);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (35, (SELECT id FROM categories WHERE slug='accesorios'), (SELECT id FROM brands WHERE slug='adidas'), 'Calcetines Pack x3', 'calcetines-pack-x3-35', 'Calcetines Pack x3 de Adidas. Prenda/accesorio de la categoría Accesorios, ideal para looks urbanos modernos.', 39.9, 20.04, 'activo', TRUE, 4.3, 156);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (35, 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (35, 'S', 'Estándar', 'SKU-35-s', 20);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (35, 'M', 'Estándar', 'SKU-35-m', 20);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (35, 'L', 'Estándar', 'SKU-35-l', 20);
INSERT INTO products (id, category_id, brand_id, name, slug, description, price, discount_percent, status, is_featured, rating_avg, rating_count) VALUES (36, (SELECT id FROM categories WHERE slug='polos'), (SELECT id FROM brands WHERE slug='h-m'), 'Polo Tie-Dye Summer', 'polo-tie-dye-summer-36', 'Polo Tie-Dye Summer de H&M. Prenda/accesorio de la categoría Polos, ideal para looks urbanos modernos.', 79.9, 0, 'activo', FALSE, 4.3, 41);
INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (36, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=400&fit=crop&auto=format', TRUE, 0);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (36, 'XS', 'Estándar', 'SKU-36-xs', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (36, 'S', 'Estándar', 'SKU-36-s', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (36, 'M', 'Estándar', 'SKU-36-m', 7);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (36, 'L', 'Estándar', 'SKU-36-l', 6);
INSERT INTO product_variants (product_id, size, color, sku, stock) VALUES (36, 'XL', 'Estándar', 'SKU-36-xl', 6);

-- Ajustar secuencia de IDs de productos tras inserts explícitos
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- Promoción de ejemplo
INSERT INTO promotions (code, description, discount_percent, applies_to, active, starts_at, ends_at) VALUES
('BIENVENIDA10', 'Descuento de bienvenida para nuevos clientes', 10, 'todo', TRUE, NOW(), NOW() + INTERVAL '90 days');

COMMIT;