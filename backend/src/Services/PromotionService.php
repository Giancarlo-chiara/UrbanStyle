<?php

namespace App\Services;

use App\Repositories\PromotionRepository;

class PromotionService
{
    public function __construct(private PromotionRepository $promotions)
    {
    }

    public function list(): array
    {
        return $this->promotions->findAll();
    }

    public function create(array $data): int
    {
        return $this->promotions->create($data);
    }

    public function update(int $id, array $data): bool
    {
        return $this->promotions->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->promotions->delete($id);
    }
}
