<?php

namespace App\Middleware;

use App\Utils\Response;

/**
 * Debe ejecutarse DESPUÉS de JwtAuthMiddleware.
 * Verifica que el usuario autenticado tenga rol 'admin'.
 */
class AdminMiddleware
{
    public static function handle(): void
    {
        $user = $GLOBALS['auth_user'] ?? null;

        if (!$user || ($user['role'] ?? '') !== 'admin') {
            Response::error('Acceso restringido a administradores.', 403);
        }
    }
}
