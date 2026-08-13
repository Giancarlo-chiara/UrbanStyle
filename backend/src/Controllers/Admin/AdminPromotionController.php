<?php

namespace App\Controllers\Admin;

use App\Services\PromotionService;
use App\Utils\Request;
use App\Utils\Response;
use App\Utils\Validator;

class AdminPromotionController
{
    public function __construct(private PromotionService $service)
    {
    }

    public function index(array $params): void
    {
        Response::success($this->service->list());
    }

    public function store(array $params): void
    {
        $data = Request::body();
        $errors = Validator::make($data, ['code' => 'required|min:3']);
        if ($errors) {
            Response::error('Datos inválidos.', 422, $errors);
        }
        $id = $this->service->create($data);
        Response::success(['id' => $id], 'Promoción creada.', 201);
    }

    public function update(array $params): void
    {
        $this->service->update((int)$params['id'], Request::body());
        Response::success(null, 'Promoción actualizada.');
    }

    public function destroy(array $params): void
    {
        $this->service->delete((int)$params['id']);
        Response::success(null, 'Promoción eliminada.');
    }
}
