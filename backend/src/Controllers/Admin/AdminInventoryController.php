<?php

namespace App\Controllers\Admin;

use App\Services\InventoryService;
use App\Utils\Request;
use App\Utils\Response;

class AdminInventoryController
{
    public function __construct(private InventoryService $service)
    {
    }

    public function index(array $params): void
    {
        Response::success($this->service->list());
    }

    public function lowStock(array $params): void
    {
        $threshold = (int)(Request::query()['threshold'] ?? 5);
        Response::success($this->service->lowStock($threshold));
    }

    public function store(array $params): void
    {
        $data = Request::body();
        if (empty($data['variant_id']) || empty($data['type']) || !isset($data['quantity'])) {
            Response::error('variant_id, type y quantity son requeridos.', 422);
        }

        try {
            $id = $this->service->register(
                (int)$data['variant_id'],
                $data['type'],
                (int)$data['quantity'],
                $data['reason'] ?? null,
                Request::authUserId()
            );
            Response::success(['id' => $id], 'Movimiento de inventario registrado.', 201);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 400);
        }
    }
}
