<?php

namespace App\Repositories;

use PDO;

class UserRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE email = :email"
        );
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at, r.name AS role
             FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO users (role_id, full_name, email, password_hash, phone)
             VALUES (:role_id, :full_name, :email, :password_hash, :phone) RETURNING id"
        );
        $stmt->execute([
            'role_id' => $data['role_id'] ?? 2,
            'full_name' => $data['full_name'],
            'email' => $data['email'],
            'password_hash' => $data['password_hash'],
            'phone' => $data['phone'] ?? null,
        ]);
        return (int)$stmt->fetchColumn();
    }

    public function updateProfile(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        foreach (['full_name', 'phone'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = :$field";
                $params[$field] = $data[$field];
            }
        }
        if (!$fields) return false;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
        return $this->db->prepare($sql)->execute($params);
    }

    // ---------------- Administración ----------------
    public function findAll(): array
    {
        $stmt = $this->db->query(
            "SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at, r.name AS role
             FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.created_at DESC"
        );
        return $stmt->fetchAll();
    }

    public function updateStatus(int $id, string $status): bool
    {
        $stmt = $this->db->prepare("UPDATE users SET status = :status WHERE id = :id");
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public function updateRole(int $id, int $roleId): bool
    {
        $stmt = $this->db->prepare("UPDATE users SET role_id = :role_id WHERE id = :id");
        return $stmt->execute(['role_id' => $roleId, 'id' => $id]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
