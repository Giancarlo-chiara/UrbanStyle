<?php

namespace App\Repositories;

use PDO;

class PromotionRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function findAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM promotions ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }

    public function findActiveByCode(string $code): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM promotions WHERE code = :code AND active = TRUE
             AND (starts_at IS NULL OR starts_at <= NOW())
             AND (ends_at IS NULL OR ends_at >= NOW())"
        );
        $stmt->execute(['code' => $code]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO promotions (code, description, discount_percent, discount_amount, applies_to, category_id, product_id, starts_at, ends_at, active)
             VALUES (:code, :description, :discount_percent, :discount_amount, :applies_to, :category_id, :product_id, :starts_at, :ends_at, :active)
             RETURNING id"
        );
        $stmt->execute([
            'code' => $data['code'],
            'description' => $data['description'] ?? null,
            'discount_percent' => $data['discount_percent'] ?? null,
            'discount_amount' => $data['discount_amount'] ?? null,
            'applies_to' => $data['applies_to'] ?? 'todo',
            'category_id' => $data['category_id'] ?? null,
            'product_id' => $data['product_id'] ?? null,
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'active' => (int)($data['active'] ?? true),
        ]);
        return (int)$stmt->fetchColumn();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        foreach (['code', 'description', 'discount_percent', 'discount_amount', 'applies_to', 'category_id', 'product_id', 'starts_at', 'ends_at', 'active'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $value = $data[$field];
                $params[$field] = is_bool($value) ? (int)$value : $value;
            }
        }
        if (!$fields) return false;
        $sql = "UPDATE promotions SET " . implode(', ', $fields) . " WHERE id = :id";
        return $this->db->prepare($sql)->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM promotions WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
