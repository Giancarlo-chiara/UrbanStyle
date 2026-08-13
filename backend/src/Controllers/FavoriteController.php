<?php

namespace App\Controllers;

use App\Services\FavoriteService;
use App\Utils\Request;
use App\Utils\Response;

class FavoriteController
{
    public function __construct(private FavoriteService $service)
    {
    }

    public function index(array $params): void
    {
        $userId = Request::authUserId();
        Response::success($this->service->list($userId));
    }

    public function store(array $params): void
    {
        $userId = Request::authUserId();
        $data = Request::body();
        if (empty($data['product_id'])) {
            Response::error('product_id es requerido.', 422);
        }
        $this->service->add($userId, (int)$data['product_id']);
        Response::success(null, 'Agregado a favoritos.', 201);
    }

    public function destroy(array $params): void
    {
        $userId = Request::authUserId();
        $this->service->remove($userId, (int)$params['productId']);
        Response::success(null, 'Eliminado de favoritos.');
    }
}
