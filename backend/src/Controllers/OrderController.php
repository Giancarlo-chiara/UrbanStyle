<?php

namespace App\Controllers;

use App\Services\OrderService;
use App\Utils\Request;
use App\Utils\Response;

class OrderController
{
    public function __construct(private OrderService $service)
    {
    }

    public function store(array $params): void
    {
        $userId = Request::authUserId();
        $data = Request::body();

        try {
            $order = $this->service->checkout($userId, $data);
            Response::success($order, 'Pedido creado exitosamente.', 201);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 400);
        }
    }

    public function index(array $params): void
    {
        $userId = Request::authUserId();
        Response::success($this->service->listByUser($userId));
    }

    public function show(array $params): void
    {
        $userId = Request::authUserId();
        $order = $this->service->findById((int)$params['id']);
        if (!$order || (int)$order['user_id'] !== $userId) {
            Response::error('Pedido no encontrado.', 404);
        }
        Response::success($order);
    }
}
