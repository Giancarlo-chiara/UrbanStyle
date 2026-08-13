<?php

namespace App\Services;

use App\Repositories\UserRepository;
use App\Utils\JwtHandler;

class AuthService
{
    public function __construct(private UserRepository $users)
    {
    }

    public function register(array $data): array
    {
        if ($this->users->findByEmail($data['email'])) {
            throw new \RuntimeException('Ya existe una cuenta con ese email.');
        }

        $userId = $this->users->create([
            'full_name' => $data['full_name'],
            'email' => $data['email'],
            'password_hash' => password_hash($data['password'], PASSWORD_BCRYPT),
            'phone' => $data['phone'] ?? null,
            'role_id' => 2, // cliente
        ]);

        $user = $this->users->findById($userId);
        $token = JwtHandler::encode(['sub' => $userId, 'role' => 'cliente', 'email' => $user['email']]);

        return ['user' => $user, 'token' => $token];
    }

    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail($email);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new \RuntimeException('Credenciales incorrectas.');
        }
        if ($user['status'] !== 'activo') {
            throw new \RuntimeException('Tu cuenta está inactiva o bloqueada.');
        }

        unset($user['password_hash']);
        $token = JwtHandler::encode(['sub' => $user['id'], 'role' => $user['role'], 'email' => $user['email']]);

        return ['user' => $user, 'token' => $token];
    }

    public function profile(int $userId): ?array
    {
        return $this->users->findById($userId);
    }
}
