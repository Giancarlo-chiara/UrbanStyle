<?php

namespace App\Middleware;

use App\Utils\JwtHandler;
use App\Utils\Response;

/**
 * Exige un JWT válido en el header Authorization: Bearer <token>.
 * Si es válido, expone el payload decodificado en $GLOBALS['auth_user'].
 */
class JwtAuthMiddleware
{
    public static function handle(): void
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!$header || !str_starts_with($header, 'Bearer ')) {
            Response::error('No autorizado. Token no proporcionado.', 401);
        }

        $token = substr($header, 7);
        $payload = JwtHandler::decode($token);

        if (!$payload) {
            Response::error('Token inválido o expirado.', 401);
        }

        $GLOBALS['auth_user'] = $payload;
    }
}
