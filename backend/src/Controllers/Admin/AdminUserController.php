<?php

namespace App\Controllers\Admin;

use App\Services\UserService;
use App\Utils\Request;
use App\Utils\Response;

class AdminUserController
{
    public function __construct(private UserService $service)
    {
    }

    public function index(array $params): void
    {
        Response::success($this->service->listAll());
    }

    public function updateStatus(array $params): void
    {
        $data = Request::body();
        if (empty($data['status'])) {
            Response::error('status es requerido.', 422);
        }
        $this->service->updateStatus((int)$params['id'], $data['status']);
        Response::success(null, 'Estado del usuario actualizado.');
    }

    public function updateRole(array $params): void
    {
        $data = Request::body();
        if (empty($data['role_id'])) {
            Response::error('role_id es requerido.', 422);
        }
        $this->service->updateRole((int)$params['id'], (int)$data['role_id']);
        Response::success(null, 'Rol actualizado.');
    }

    public function destroy(array $params): void
    {
        $this->service->delete((int)$params['id']);
        Response::success(null, 'Usuario eliminado.');
    }
}
