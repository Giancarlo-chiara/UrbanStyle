<?php

namespace App\Config;

use PDO;
use PDOException;

/**
 * Conexión única (singleton) a PostgreSQL vía PDO.
 * Todas las Repositories reciben esta instancia inyectada.
 */
class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host = Env::get('DB_HOST', '127.0.0.1');
            $port = Env::get('DB_PORT', '5432');
            $dbname = Env::get('DB_DATABASE', 'urbanstyle');
            $user = Env::get('DB_USERNAME', 'postgres');
            $pass = Env::get('DB_PASSWORD', '');

            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";

            try {
                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                // PostgreSQL devuelve sus errores en la codificación del sistema
                // operativo. En un Windows en español eso NO es UTF-8, así que
                // json_encode devolvía false y `echo false` no imprimía nada:
                // la API respondía un 500 con cuerpo VACÍO, precisamente cuando
                // el mensaje de error es lo único que permite diagnosticar.
                echo json_encode([
                    'success' => false,
                    'message' => 'Error de conexión a la base de datos.',
                    'error' => $e->getMessage(),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
                exit;
            }
        }

        return self::$instance;
    }
}
