<?php

namespace App\Repositories;

use PDO;

/**
 * Encapsula todas las consultas SQL relacionadas a productos.
 * Los Services nunca escriben SQL directamente: siempre pasan por aquí.
 */
class ProductRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * Lista productos aplicando filtros dinámicos, orden y paginación.
     * $filters admite: category, brand, size, minPrice, maxPrice, sort, search, featured, isNew, onSale, limit, page
     */
    /**
     * @param bool $incluirInactivos Solo el panel admin lo activa. NO se lee de $_GET
     *                               a propósito, para que la tienda no pueda pedirlo.
     */
    public function findAll(array $filters = [], bool $incluirInactivos = false): array
    {
        // category_id / brand_id / subcategory_id van en el SELECT porque el formulario
        // de edición del panel los necesita para preseleccionar sus <select>.
        $sql = "SELECT p.id, p.name, p.slug, p.description, p.price, p.discount_percent, p.final_price,
                       p.status, p.is_featured, p.rating_avg, p.rating_count, p.created_at,
                       p.category_id, p.subcategory_id, p.brand_id,
                       c.name AS category, c.slug AS category_slug,
                       b.name AS brand, b.slug AS brand_slug,
                       (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS image,
                       (SELECT COALESCE(SUM(stock),0) FROM product_variants pv WHERE pv.product_id = p.id) AS stock
                FROM products p
                JOIN categories c ON c.id = p.category_id
                JOIN brands b ON b.id = p.brand_id
                WHERE 1 = 1";

        if (!$incluirInactivos) {
            $sql .= " AND p.status != 'inactivo'";
        }

        $params = [];

        if (!empty($filters['category'])) {
            $sql .= " AND c.slug = :category";
            $params['category'] = $filters['category'];
        }
        if (!empty($filters['brand'])) {
            $sql .= " AND b.slug = :brand";
            $params['brand'] = $filters['brand'];
        }
        if (!empty($filters['size'])) {
            $sql .= " AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size = :size)";
            $params['size'] = $filters['size'];
        }
        if (!empty($filters['minPrice'])) {
            $sql .= " AND p.final_price >= :minPrice";
            $params['minPrice'] = $filters['minPrice'];
        }
        if (!empty($filters['maxPrice'])) {
            $sql .= " AND p.final_price <= :maxPrice";
            $params['maxPrice'] = $filters['maxPrice'];
        }
        if (!empty($filters['search'])) {
            $sql .= " AND (p.name ILIKE :search OR b.name ILIKE :search)";
            $params['search'] = '%' . $filters['search'] . '%';
        }
        if (!empty($filters['featured'])) {
            $sql .= " AND p.is_featured = TRUE";
        }
        if (!empty($filters['isNew'])) {
            $sql .= " AND p.created_at >= NOW() - INTERVAL '30 days'";
        }
        if (!empty($filters['onSale'])) {
            $sql .= " AND p.discount_percent > 0";
        }

        switch ($filters['sort'] ?? 'newest') {
            case 'price_desc': $sql .= " ORDER BY p.final_price DESC"; break;
            case 'price_asc': $sql .= " ORDER BY p.final_price ASC"; break;
            case 'top_rated': $sql .= " ORDER BY p.rating_avg DESC"; break;
            case 'best_selling': $sql .= " ORDER BY p.rating_count DESC"; break;
            default: $sql .= " ORDER BY p.created_at DESC"; break;
        }

        // Acotado: sin esto, ?limit=-1 rompía con un 500 de PostgreSQL y
        // ?limit=1000000 permitía volcar el catálogo entero de una sola petición.
        $limit = min(100, max(1, (int)($filters['limit'] ?? 24)));
        $page = max(1, (int)($filters['page'] ?? 1));
        $offset = ($page - 1) * $limit;
        $sql .= " LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function countAll(array $filters = [], bool $incluirInactivos = false): int
    {
        $sql = "SELECT COUNT(*) FROM products p
                JOIN categories c ON c.id = p.category_id
                JOIN brands b ON b.id = p.brand_id
                WHERE 1 = 1";
        if (!$incluirInactivos) {
            $sql .= " AND p.status != 'inactivo'";
        }
        $params = [];

        if (!empty($filters['category'])) { $sql .= " AND c.slug = :category"; $params['category'] = $filters['category']; }
        if (!empty($filters['brand'])) { $sql .= " AND b.slug = :brand"; $params['brand'] = $filters['brand']; }
        if (!empty($filters['search'])) { $sql .= " AND (p.name ILIKE :search OR b.name ILIKE :search)"; $params['search'] = '%' . $filters['search'] . '%'; }
        if (!empty($filters['size'])) { $sql .= " AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size = :size)"; $params['size'] = $filters['size']; }
        if (!empty($filters['minPrice'])) { $sql .= " AND p.final_price >= :minPrice"; $params['minPrice'] = $filters['minPrice']; }
        if (!empty($filters['maxPrice'])) { $sql .= " AND p.final_price <= :maxPrice"; $params['maxPrice'] = $filters['maxPrice']; }
        if (!empty($filters['featured'])) { $sql .= " AND p.is_featured = TRUE"; }
        if (!empty($filters['isNew'])) { $sql .= " AND p.created_at >= NOW() - INTERVAL '30 days'"; }
        if (!empty($filters['onSale'])) { $sql .= " AND p.discount_percent > 0"; }

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }
        $stmt->execute();
        return (int)$stmt->fetchColumn();
    }

    /**
     * Tallas realmente existentes en el catálogo visible.
     * Sirve para que el filtro del sidebar no tenga una lista hardcodeada.
     */
    public function findSizes(): array
    {
        $stmt = $this->db->query(
            "SELECT DISTINCT pv.size
             FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             WHERE p.status != 'inactivo'
             ORDER BY pv.size ASC"
        );
        return array_column($stmt->fetchAll(), 'size');
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT p.*, c.name AS category, c.slug AS category_slug,
                    b.name AS brand, b.slug AS brand_slug
             FROM products p
             JOIN categories c ON c.id = p.category_id
             JOIN brands b ON b.id = p.brand_id
             WHERE p.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch();
        if (!$product) {
            return null;
        }

        $product['images'] = $this->getImages($id);
        $product['variants'] = $this->getVariants($id);
        return $product;
    }

    public function getImages(int $productId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, url, is_primary, sort_order FROM product_images
             WHERE product_id = :id ORDER BY is_primary DESC, sort_order ASC"
        );
        $stmt->execute(['id' => $productId]);
        return $stmt->fetchAll();
    }

    public function getVariants(int $productId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, size, color, sku, stock FROM product_variants
             WHERE product_id = :id ORDER BY id ASC"
        );
        $stmt->execute(['id' => $productId]);
        return $stmt->fetchAll();
    }

    public function findRelated(int $productId, int $categoryId, int $limit = 4): array
    {
        $stmt = $this->db->prepare(
            "SELECT p.id, p.name, p.slug, p.price, p.discount_percent, p.final_price, p.rating_avg, p.rating_count, p.created_at,
                    b.name AS brand, c.name AS category,
                    (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC LIMIT 1) AS image,
                    (SELECT COALESCE(SUM(stock),0) FROM product_variants pv WHERE pv.product_id = p.id) AS stock
             FROM products p
             JOIN brands b ON b.id = p.brand_id
             JOIN categories c ON c.id = p.category_id
             WHERE p.category_id = :category_id AND p.id != :id AND p.status = 'activo'
             ORDER BY RANDOM() LIMIT :limit"
        );
        $stmt->bindValue(':category_id', $categoryId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $productId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // ---------------------------------------------------------------
    // CRUD administrativo
    // ---------------------------------------------------------------
    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO products (category_id, subcategory_id, brand_id, name, slug, description, price, discount_percent, status, is_featured)
             VALUES (:category_id, :subcategory_id, :brand_id, :name, :slug, :description, :price, :discount_percent, :status, :is_featured)
             RETURNING id"
        );
        $stmt->execute([
            'category_id' => $data['category_id'],
            'subcategory_id' => $data['subcategory_id'] ?? null,
            'brand_id' => $data['brand_id'],
            'name' => $data['name'],
            'slug' => $data['slug'],
            'description' => $data['description'] ?? null,
            'price' => $data['price'],
            'discount_percent' => $data['discount_percent'] ?? 0,
            'status' => $data['status'] ?? 'activo',
            'is_featured' => (int)($data['is_featured'] ?? false),
        ]);
        return (int)$stmt->fetchColumn();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        $allowed = ['category_id', 'subcategory_id', 'brand_id', 'name', 'slug', 'description', 'price', 'discount_percent', 'status', 'is_featured'];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $value = $data[$field];
                $params[$field] = is_bool($value) ? (int)$value : $value;
            }
        }
        if (!$fields) {
            return false;
        }

        $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM products WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public function addImage(int $productId, string $url, bool $isPrimary = false, int $sortOrder = 0): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (:pid, :url, :primary, :sort) RETURNING id"
        );
        $stmt->execute(['pid' => $productId, 'url' => $url, 'primary' => (int)$isPrimary, 'sort' => $sortOrder]);
        return (int)$stmt->fetchColumn();
    }

    public function removeImage(int $imageId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM product_images WHERE id = :id");
        return $stmt->execute(['id' => $imageId]);
    }

    public function addVariant(int $productId, string $size, string $color, ?string $sku, int $stock): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO product_variants (product_id, size, color, sku, stock)
             VALUES (:pid, :size, :color, :sku, :stock) RETURNING id"
        );
        $stmt->execute(['pid' => $productId, 'size' => $size, 'color' => $color, 'sku' => $sku, 'stock' => $stock]);
        return (int)$stmt->fetchColumn();
    }

    public function updateVariantStock(int $variantId, int $stock): bool
    {
        $stmt = $this->db->prepare("UPDATE product_variants SET stock = :stock WHERE id = :id");
        return $stmt->execute(['stock' => $stock, 'id' => $variantId]);
    }

    public function deleteVariant(int $variantId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM product_variants WHERE id = :id");
        return $stmt->execute(['id' => $variantId]);
    }

    public function findVariantById(int $variantId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM product_variants WHERE id = :id");
        $stmt->execute(['id' => $variantId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }
}
