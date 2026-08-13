<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Services\UserService;
use App\Utils\Request;
use App\Utils\Response;

class UserController
{
    public function __construct(private AuthService $authService, private UserService $userService)
    {
    }

    public function profile(array $params): void
    {
        $userId = Request::authUserId();
        $user = $this->authService->profile($userId);
        Response::success($user);
    }

    public function updateProfile(array $params): void
    {
        $userId = Request::authUserId();
        $data = Request::body();
        $this->userService->updateProfile($userId, $data);
        Response::success($this->authService->profile($userId), 'Perfil actualizado.');
    }
}
