<?php

namespace App\Controllers;

use App\Services\BrandService;
use App\Utils\Response;

class BrandController
{
    public function __construct(private BrandService $service)
    {
    }

    public function index(array $params): void
    {
        Response::success($this->service->list());
    }
}
