<?php

namespace App\Controllers\Admin;

use App\Services\BrandService;
use App\Utils\Request;
use App\Utils\Response;
use App\Utils\Validator;

class AdminBrandController
{
    public function __construct(private BrandService $service)
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
        Response::success(['id' => $id], 'Marca creada.', 201);
    }

    public function update(array $params): void
    {
        $this->service->update((int)$params['id'], Request::body());
        Response::success(null, 'Marca actualizada.');
    }

    public function destroy(array $params): void
    {
        $this->service->delete((int)$params['id']);
        Response::success(null, 'Marca eliminada.');
    }
}
