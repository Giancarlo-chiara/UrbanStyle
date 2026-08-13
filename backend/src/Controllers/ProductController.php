<?php

namespace App\Controllers;

use App\Services\ProductService;
use App\Utils\Request;
use App\Utils\Response;

class ProductController
{
    public function __construct(private ProductService $service)
    {
    }

    public function index(array $params): void
    {
        $filters = Request::query();
        $result = $this->service->list($filters);
        Response::success($result);
    }

    public function show(array $params): void
    {
        $product = $this->service->findById((int)$params['id']);
        // findById no filtra por estado (el panel admin necesita ver los inactivos),
        // así que el filtro de visibilidad pública se aplica aquí. Antes esta ruta
        // servía productos 'inactivo' que el listado sí oculta.
        if (!$product || ($product['status'] ?? '') === 'inactivo') {
            Response::error('Producto no encontrado.', 404);
        }
        Response::success($product);
    }

    public function sizes(array $params): void
    {
        Response::success($this->service->sizes());
    }

    public function related(array $params): void
    {
        Response::success($this->service->related((int)$params['id']));
    }

    public function featured(array $params): void
    {
        $result = $this->service->list(['featured' => 1, 'limit' => 8]);
        Response::success($result['items']);
    }

    public function newArrivals(array $params): void
    {
        $result = $this->service->list(['isNew' => 1, 'limit' => 8]);
        Response::success($result['items']);
    }

    public function onSale(array $params): void
    {
        $result = $this->service->list(['onSale' => 1, 'limit' => 12]);
        Response::success($result['items']);
    }
}
