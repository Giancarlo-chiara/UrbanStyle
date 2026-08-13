<?php

namespace App\Controllers\Admin;

use App\Services\OrderService;
use App\Utils\Request;
use App\Utils\Response;

class AdminOrderController
{
    public function __construct(private OrderService $service)
    {
    }

    public function index(array $params): void
    {
        Response::success($this->service->listAll());
    }

    public function show(array $params): void
    {
        $order = $this->service->findById((int)$params['id']);
        if (!$order) {
            Response::error('Pedido no encontrado.', 404);
        }
        Response::success($order);
    }

    public function updateStatus(array $params): void
    {
        $data = Request::body();
        if (empty($data['status'])) {
            Response::error('status es requerido.', 422);
        }
        $this->service->updateStatus((int)$params['id'], $data['status'], $data['note'] ?? null);
        Response::success(null, 'Estado del pedido actualizado.');
    }
}
