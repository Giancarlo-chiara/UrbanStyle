<?php

namespace App\Utils;

/**
 * Lee y decodifica el cuerpo JSON de la petición entrante.
 */
class Request
{
    private static ?array $body = null;

    public static function body(): array
    {
        if (self::$body === null) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw, true);
            self::$body = is_array($decoded) ? $decoded : [];
        }
        return self::$body;
    }

    public static function query(): array
    {
        return $_GET ?? [];
    }

    public static function authUserId(): ?int
    {
        return isset($GLOBALS['auth_user']['sub']) ? (int)$GLOBALS['auth_user']['sub'] : null;
    }

    public static function authRole(): ?string
    {
        return $GLOBALS['auth_user']['role'] ?? null;
    }
}
