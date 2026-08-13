<?php

namespace App\Repositories;

use PDO;

class BrandRepository
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
        $stmt = $this->db->query("SELECT id, name, slug, logo_url, status FROM brands $where ORDER BY name ASC");
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM brands WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO brands (name, slug, logo_url) VALUES (:name, :slug, :logo) RETURNING id"
        );
        $stmt->execute([
            'name' => $data['name'],
            'slug' => $data['slug'],
            'logo' => $data['logo_url'] ?? null,
        ]);
        return (int)$stmt->fetchColumn();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        foreach (['name', 'slug', 'logo_url', 'status'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }
        if (!$fields) return false;
        $sql = "UPDATE brands SET " . implode(', ', $fields) . " WHERE id = :id";
        return $this->db->prepare($sql)->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM brands WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
