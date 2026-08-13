<?php

namespace App\Controllers;

use App\Services\CategoryService;
use App\Utils\Response;

class CategoryController
{
    public function __construct(private CategoryService $service)
    {
    }

    public function index(array $params): void
    {
        Response::success($this->service->list());
    }
}
