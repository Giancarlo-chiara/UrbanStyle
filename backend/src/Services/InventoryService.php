<?php

namespace App\Services;

use App\Repositories\InventoryRepository;

class InventoryService
{
    public function __construct(private InventoryRepository $inventory)
    {
    }

    public function list(): array
    {
        return $this->inventory->findAll();
    }

    public function register(int $variantId, string $type, int $quantity, ?string $reason, ?int $createdBy): int
    {
        if (!in_array($type, ['entrada', 'salida', 'ajuste'], true)) {
            throw new \RuntimeException('Tipo de movimiento inválido.');
        }
        return $this->inventory->register($variantId, $type, $quantity, $reason, $createdBy);
    }

    public function lowStock(int $threshold = 5): array
    {
        return $this->inventory->lowStock($threshold);
    }
}
