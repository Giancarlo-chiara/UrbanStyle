<?php

namespace App\Repositories;

use PDO;

class CategoryRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * @param bool $soloActivos La tienda solo muestra activas; el panel admin
     *                          necesita ver también las inactivas para reactivarlas.
     */
    public function findAll(bool $soloActivos = true): array
    {
        $where = $soloActivos ? "WHERE status = 'activo'" : '';
        $stmt = $this->db->query(
            "SELECT id, parent_id, name, slug, icon, status FROM categories $where ORDER BY name ASC"
        );
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM categories WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO categories (parent_id, name, slug, icon) VALUES (:parent_id, :name, :slug, :icon) RETURNING id"
        );
        $stmt->execute([
            'parent_id' => $data['parent_id'] ?? null,
            'name' => $data['name'],
            'slug' => $data['slug'],
            'icon' => $data['icon'] ?? null,
        ]);
        return (int)$stmt->fetchColumn();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        foreach (['parent_id', 'name', 'slug', 'icon', 'status'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }
        if (!$fields) return false;
        $sql = "UPDATE categories SET " . implode(', ', $fields) . " WHERE id = :id";
        return $this->db->prepare($sql)->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM categories WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
