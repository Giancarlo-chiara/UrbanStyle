<?php

namespace App\Router;

/**
 * Router minimalista basado en expresiones regulares para rutas con
 * parámetros dinámicos (ej: /products/{id}).
 * No usa ningún framework, solo PHP puro.
 */
class Router
{
    private array $routes = [];

    public function addRoute(string $method, string $pattern, callable $handler, array $middlewares = []): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
            'middlewares' => $middlewares,
        ];
    }

    public function get(string $pattern, callable $handler, array $middlewares = []): void
    {
        $this->addRoute('GET', $pattern, $handler, $middlewares);
    }

    public function post(string $pattern, callable $handler, array $middlewares = []): void
    {
        $this->addRoute('POST', $pattern, $handler, $middlewares);
    }

    public function put(string $pattern, callable $handler, array $middlewares = []): void
    {
        $this->addRoute('PUT', $pattern, $handler, $middlewares);
    }

    public function delete(string $pattern, callable $handler, array $middlewares = []): void
    {
        $this->addRoute('DELETE', $pattern, $handler, $middlewares);
    }

    private function toRegex(string $pattern): string
    {
        // Convierte /products/{id} en #^/products/(?P<id>[^/]+)$#
        $regex = preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $pattern);
        return '#^' . $regex . '$#';
    }

    public function dispatch(string $method, string $uri): void
    {
        $path = parse_url($uri, PHP_URL_PATH);
        $path = rtrim($path, '/');
        if ($path === '') {
            $path = '/';
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== strtoupper($method)) {
                continue;
            }
            $regex = $this->toRegex($route['pattern']);
            if (preg_match($regex, $path, $matches)) {
                $params = array_filter($matches, fn($k) => !is_int($k), ARRAY_FILTER_USE_KEY);

                // Ejecuta middlewares en cadena; cualquiera puede detener la ejecución
                foreach ($route['middlewares'] as $middleware) {
                    $middleware($params);
                }

                ($route['handler'])($params);
                return;
            }
        }

        header('Content-Type: application/json; charset=utf-8');
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Ruta no encontrada: ' . $path]);
    }
}
