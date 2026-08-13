<?php

namespace App\Services;

use App\Repositories\FavoriteRepository;

class FavoriteService
{
    public function __construct(private FavoriteRepository $favorites)
    {
    }

    public function list(int $userId): array
    {
        return $this->favorites->findByUser($userId);
    }

    public function add(int $userId, int $productId): bool
    {
        return $this->favorites->add($userId, $productId);
    }

    public function remove(int $userId, int $productId): bool
    {
        return $this->favorites->remove($userId, $productId);
    }
}
