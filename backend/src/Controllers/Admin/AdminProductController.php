<?php

namespace App\Controllers\Admin;

use App\Services\ProductService;
use App\Utils\Request;
use App\Utils\Response;
use App\Utils\Validator;

/**
 * CRUD completo de productos para el panel administrativo.
 * Todas las rutas aquí exigen JwtAuthMiddleware + AdminMiddleware.
 */
class AdminProductController
{
    public function __construct(private ProductService $service)
    {
    }

    public function index(array $params): void
    {
        // El admin SÍ ve los productos inactivos (segundo argumento), algo que
        // antes el comentario prometía pero el SQL del listado no hacía.
        $filters = Request::query();
        $filters['limit'] = $filters['limit'] ?? 100;
        Response::success($this->service->list($filters, true));
    }

    public function show(array $params): void
    {
        $product = $this->service->findById((int)$params['id']);
        if (!$product) {
            Response::error('Producto no encontrado.', 404);
        }
        Response::success($product);
    }

    public function store(array $params): void
    {
        $data = Request::body();
        $errors = Validator::make($data, [
            'name' => 'required|min:3',
            'category_id' => 'required|numeric',
            'brand_id' => 'required|numeric',
            'price' => 'required|numeric',
        ]);
        if ($errors) {
            Response::error('Datos inválidos.', 422, $errors);
        }

        $id = $this->service->create($data);
        Response::success($this->service->findById($id), 'Producto creado.', 201);
    }

    public function update(array $params): void
    {
        $id = (int)$params['id'];
        $data = Request::body();
        $this->service->update($id, $data);
        Response::success($this->service->findById($id), 'Producto actualizado.');
    }

    public function destroy(array $params): void
    {
        $this->service->delete((int)$params['id']);
        Response::success(null, 'Producto eliminado.');
    }

    public function addImage(array $params): void
    {
        $data = Request::body();
        if (empty($data['url'])) {
            Response::error('url es requerida.', 422);
        }
        $imageId = $this->service->addImage((int)$params['id'], $data['url'], $data['is_primary'] ?? false);
        Response::success(['id' => $imageId], 'Imagen agregada.', 201);
    }

    public function removeImage(array $params): void
    {
        $this->service->removeImage((int)$params['imageId']);
        Response::success(null, 'Imagen eliminada.');
    }

    public function addVariant(array $params): void
    {
        $data = Request::body();
        $variantId = $this->service->addVariant((int)$params['id'], $data);
        Response::success(['id' => $variantId], 'Variante agregada.', 201);
    }

    public function updateVariant(array $params): void
    {
        $data = Request::body();
        $this->service->updateVariantStock((int)$params['variantId'], (int)($data['stock'] ?? 0));
        Response::success(null, 'Variante actualizada.');
    }

    public function deleteVariant(array $params): void
    {
        $this->service->deleteVariant((int)$params['variantId']);
        Response::success(null, 'Variante eliminada.');
    }
}
