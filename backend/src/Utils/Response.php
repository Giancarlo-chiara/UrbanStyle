<?php

namespace App\Utils;

/**
 * Estandariza todas las respuestas JSON de la API.
 */
class Response
{
    public static function json($data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        // JSON_INVALID_UTF8_SUBSTITUTE evita que un solo byte mal codificado
        // (típico en los mensajes de error de PostgreSQL en sistemas no UTF-8)
        // haga que json_encode devuelva false y se emita un cuerpo VACÍO con
        // Content-Type de JSON, que el cliente solo puede leer como "error de
        // parseo" sin ninguna pista de la causa real.
        $payload = json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
        );

        if ($payload === false) {
            // Red de seguridad: si aun así falla, devolvemos un JSON válido
            // en lugar de nada.
            http_response_code(500);
            $payload = json_encode([
                'success' => false,
                'message' => 'La respuesta no se pudo serializar como JSON.',
                'errors' => ['json' => json_last_error_msg()],
            ]);
        }

        echo $payload;
        exit;
    }

    public static function success($data = null, string $message = 'OK', int $status = 200): void
    {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    public static function error(string $message = 'Error', int $status = 400, $errors = null): void
    {
        self::json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }
}
