<?php

namespace App\Middleware;

use App\Config\Env;

/**
 * Habilita CORS para que el frontend React (Vite, puerto distinto)
 * pueda consumir la API sin bloqueos del navegador.
 */
class CorsMiddleware
{
    public static function handle(): void
    {
        $allowedOrigin = Env::get('CORS_ALLOWED_ORIGIN', '*');

        header("Access-Control-Allow-Origin: {$allowedOrigin}");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
