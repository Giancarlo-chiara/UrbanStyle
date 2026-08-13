<?php

/**
 * Ejecuta un archivo .sql contra la base configurada en backend/.env
 * sin depender de psql ni de la codificación de la consola de Windows.
 *
 *   php backend/migrar.php ../database/migrations/003_iconos_categorias.sql
 */

declare(strict_types=1);

spl_autoload_register(function (string $class) {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $path = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
    if (file_exists($path)) {
        require $path;
    }
});

use App\Config\Database;
use App\Config\Env;

$archivo = $argv[1] ?? null;
if (!$archivo) {
    fwrite(STDERR, "Uso: php migrar.php <ruta-al-archivo.sql>\n");
    exit(1);
}
$ruta = realpath($archivo) ?: realpath(__DIR__ . '/' . $archivo);
if (!$ruta || !is_file($ruta)) {
    fwrite(STDERR, "No encuentro el archivo: $archivo\n");
    exit(1);
}

Env::load(__DIR__ . '/.env');
$db = Database::getConnection();

// PDO envía en UTF-8; así evitamos el problema de doble codificación de psql.
$db->exec("SET client_encoding TO 'UTF8'");

$sql = file_get_contents($ruta);
if (!mb_check_encoding($sql, 'UTF-8')) {
    fwrite(STDERR, "El archivo no está en UTF-8.\n");
    exit(1);
}

echo "Ejecutando " . basename($ruta) . " ...\n";
try {
    $db->exec($sql);
    echo "OK\n";
} catch (\Throwable $e) {
    fwrite(STDERR, "FALLÓ: " . $e->getMessage() . "\n");
    exit(1);
}
