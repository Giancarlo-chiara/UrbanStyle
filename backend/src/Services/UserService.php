<?php

namespace App\Services;

use App\Repositories\UserRepository;

class UserService
{
    public function __construct(private UserRepository $users)
    {
    }

    public function updateProfile(int $userId, array $data): bool
    {
        return $this->users->updateProfile($userId, $data);
    }

    public function listAll(): array
    {
        return $this->users->findAll();
    }

    public function updateStatus(int $id, string $status): bool
    {
        return $this->users->updateStatus($id, $status);
    }

    public function updateRole(int $id, int $roleId): bool
    {
        return $this->users->updateRole($id, $roleId);
    }

    public function delete(int $id): bool
    {
        return $this->users->delete($id);
    }
}
