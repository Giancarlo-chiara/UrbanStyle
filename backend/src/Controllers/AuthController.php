<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Utils\Request;
use App\Utils\Response;
use App\Utils\Validator;

class AuthController
{
    public function __construct(private AuthService $service)
    {
    }

    public function register(array $params): void
    {
        $data = Request::body();
        $errors = Validator::make($data, [
            'full_name' => 'required|min:3',
            'email' => 'required|email',
            'password' => 'required|min:6',
        ]);
        if ($errors) {
            Response::error('Datos inválidos.', 422, $errors);
        }

        try {
            $result = $this->service->register($data);
            Response::success($result, 'Cuenta creada exitosamente.', 201);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 409);
        }
    }

    public function login(array $params): void
    {
        $data = Request::body();
        $errors = Validator::make($data, [
            'email' => 'required|email',
            'password' => 'required',
        ]);
        if ($errors) {
            Response::error('Datos inválidos.', 422, $errors);
        }

        try {
            $result = $this->service->login($data['email'], $data['password']);
            Response::success($result, 'Sesión iniciada.');
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 401);
        }
    }
}
