<?php

namespace App\Controllers\Admin;

use App\Services\CategoryService;
use App\Utils\Request;
use App\Utils\Response;
use App\Utils\Validator;

class AdminCategoryController
{
    public function __construct(private CategoryService $service)
    {
    }

    public function index(array $params): void
    {
        // El panel lista TODAS (incluidas las inactivas) para poder reactivarlas.
        Response::success($this->service->list(false));
    }

    public function store(array $params): void
    {
        $data = Request::body();
        $errors = Validator::make($data, ['name' => 'required|min:2']);
        if ($errors) {
            Response::error('Datos inválidos.', 422, $errors);
        }
        $id = $this->service->create($data);
        Response::success(['id' => $id], 'Categoría creada.', 201);
    }

    public function update(array $params): void
    {
        $this->service->update((int)$params['id'], Request::body());
        Response::success(null, 'Categoría actualizada.');
    }

    public function destroy(array $params): void
    {
        $this->service->delete((int)$params['id']);
        Response::success(null, 'Categoría eliminada.');
    }
}
