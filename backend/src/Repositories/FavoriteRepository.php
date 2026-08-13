<?php

namespace App\Repositories;

use PDO;

class FavoriteRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function findByUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT p.id, p.name, p.slug, p.price, p.discount_percent, p.final_price, p.rating_avg, p.rating_count, p.created_at,
                    b.name AS brand, c.name AS category,
                    (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC LIMIT 1) AS image,
                    (SELECT COALESCE(SUM(stock),0) FROM product_variants pv WHERE pv.product_id = p.id) AS stock
             FROM favorites f
             JOIN products p ON p.id = f.product_id
             JOIN brands b ON b.id = p.brand_id
             JOIN categories c ON c.id = p.category_id
             WHERE f.user_id = :user_id
             ORDER BY f.created_at DESC"
        );
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public function add(int $userId, int $productId): bool
    {
        $stmt = $this->db->prepare(
            "INSERT INTO favorites (user_id, product_id) VALUES (:user_id, :product_id)
             ON CONFLICT (user_id, product_id) DO NOTHING"
        );
        return $stmt->execute(['user_id' => $userId, 'product_id' => $productId]);
    }

    public function remove(int $userId, int $productId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM favorites WHERE user_id = :user_id AND product_id = :product_id");
        return $stmt->execute(['user_id' => $userId, 'product_id' => $productId]);
    }
}
