<?php

namespace App\Config;

/**
 * Cargador simple de archivos .env (sin depender de vlucas/phpdotenv).
 * Lee backend/.env y expone los valores mediante Env::get().
 */
class Env
{
    private static bool $loaded = false;
    private static array $values = [];

    public static function load(string $path): void
    {
        if (self::$loaded || !file_exists($path)) {
            self::$loaded = true;
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            // quitar comillas envolventes si existen
            if (preg_match('/^"(.*)"$/', $value, $m) || preg_match("/^'(.*)'$/", $value, $m)) {
                $value = $m[1];
            }
            self::$values[$key] = $value;
            putenv("$key=$value");
        }
        self::$loaded = true;
    }

    public static function get(string $key, $default = null)
    {
        // Ojo con la precedencia: `?? ... ?: ...` agrupa como `(a ?? b) ?: c`,
        // así que una variable definida pero vacía ('' o '0') caía al default.
        if (array_key_exists($key, self::$values)) {
            return self::$values[$key];
        }
        $fromEnv = getenv($key);
        return $fromEnv === false ? $default : $fromEnv;
    }
}
