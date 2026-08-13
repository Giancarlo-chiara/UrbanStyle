<?php

declare(strict_types=1);

// =====================================================================
// UrbanStyle API — Front Controller
// PHP puro (sin frameworks). Autoload PSR-4 manual + Router propio.
// =====================================================================

// ---- Autoload PSR-4 manual (App\ -> src/) --------------------------
spl_autoload_register(function (string $class) {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/../src/' . str_replace('\\', '/', $relative) . '.php';
    if (file_exists($path)) {
        require $path;
    }
});

use App\Config\Database;
use App\Config\Env;
use App\Controllers\AuthController;
use App\Controllers\BrandController;
use App\Controllers\CategoryController;
use App\Controllers\FavoriteController;
use App\Controllers\OrderController;
use App\Controllers\ProductController;
use App\Controllers\UserController;
use App\Controllers\Admin\AdminBrandController;
use App\Controllers\Admin\AdminCategoryController;
use App\Controllers\Admin\AdminInventoryController;
use App\Controllers\Admin\AdminOrderController;
use App\Controllers\Admin\AdminProductController;
use App\Controllers\Admin\AdminPromotionController;
use App\Controllers\Admin\AdminUserController;
use App\Middleware\AdminMiddleware;
use App\Middleware\CorsMiddleware;
use App\Middleware\JwtAuthMiddleware;
use App\Repositories\BrandRepository;
use App\Repositories\CategoryRepository;
use App\Repositories\FavoriteRepository;
use App\Repositories\InventoryRepository;
use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;
use App\Repositories\PromotionRepository;
use App\Repositories\UserRepository;
use App\Router\Router;
use App\Services\AuthService;
use App\Services\BrandService;
use App\Services\CategoryService;
use App\Services\FavoriteService;
use App\Services\InventoryService;
use App\Services\OrderService;
use App\Services\ProductService;
use App\Services\PromotionService;
use App\Services\UserService;
use App\Utils\Response;

Env::load(__DIR__ . '/../.env');
CorsMiddleware::handle();

set_exception_handler(function (\Throwable $e) {
    Response::error('Error interno del servidor.', 500, [
        'exception' => $e->getMessage(),
    ]);
});

// ---- Inyección de dependencias simple (sin contenedor) --------------
$db = Database::getConnection();

$productRepo = new ProductRepository($db);
$categoryRepo = new CategoryRepository($db);
$brandRepo = new BrandRepository($db);
$userRepo = new UserRepository($db);
$orderRepo = new OrderRepository($db);
$favoriteRepo = new FavoriteRepository($db);
$promotionRepo = new PromotionRepository($db);
$inventoryRepo = new InventoryRepository($db);

$productService = new ProductService($productRepo);
$categoryService = new CategoryService($categoryRepo);
$brandService = new BrandService($brandRepo);
$authService = new AuthService($userRepo);
$userService = new UserService($userRepo);
$orderService = new OrderService($orderRepo, $productRepo, $promotionRepo);
$favoriteService = new FavoriteService($favoriteRepo);
$inventoryService = new InventoryService($inventoryRepo);
$promotionService = new PromotionService($promotionRepo);

$productController = new ProductController($productService);
$categoryController = new CategoryController($categoryService);
$brandController = new BrandController($brandService);
$authController = new AuthController($authService);
$userController = new UserController($authService, $userService);
$orderController = new OrderController($orderService);
$favoriteController = new FavoriteController($favoriteService);

$adminProductController = new AdminProductController($productService);
$adminCategoryController = new AdminCategoryController($categoryService);
$adminBrandController = new AdminBrandController($brandService);
$adminUserController = new AdminUserController($userService);
$adminOrderController = new AdminOrderController($orderService);
$adminInventoryController = new AdminInventoryController($inventoryService);
$adminPromotionController = new AdminPromotionController($promotionService);

// ---- Middlewares reutilizables ---------------------------------------
$auth = fn() => JwtAuthMiddleware::handle();
$admin = fn() => AdminMiddleware::handle();

// ---- Definición de rutas ---------------------------------------------
$router = new Router();

// Salud de la API
$router->get('/api/health', fn($p) => Response::success(['status' => 'up'], 'UrbanStyle API funcionando.'));

// Catálogo público
$router->get('/api/products', [$productController, 'index']);
$router->get('/api/products/featured', [$productController, 'featured']);
$router->get('/api/products/new', [$productController, 'newArrivals']);
$router->get('/api/products/offers', [$productController, 'onSale']);
$router->get('/api/products/sizes', [$productController, 'sizes']);
// OJO: /api/products/{id} debe quedar DESPUÉS de las rutas literales de arriba,
// porque el Router devuelve la primera coincidencia por orden de registro.
$router->get('/api/products/{id}', [$productController, 'show']);
$router->get('/api/products/{id}/related', [$productController, 'related']);
$router->get('/api/categories', [$categoryController, 'index']);
$router->get('/api/brands', [$brandController, 'index']);

// Autenticación
$router->post('/api/auth/register', [$authController, 'register']);
$router->post('/api/auth/login', [$authController, 'login']);

// Usuario autenticado
$router->get('/api/users/profile', [$userController, 'profile'], [$auth]);
$router->put('/api/users/profile', [$userController, 'updateProfile'], [$auth]);

// Pedidos (requieren sesión)
$router->post('/api/orders', [$orderController, 'store'], [$auth]);
$router->get('/api/orders', [$orderController, 'index'], [$auth]);
$router->get('/api/orders/{id}', [$orderController, 'show'], [$auth]);

// Favoritos (requieren sesión)
$router->get('/api/favorites', [$favoriteController, 'index'], [$auth]);
$router->post('/api/favorites', [$favoriteController, 'store'], [$auth]);
$router->delete('/api/favorites/{productId}', [$favoriteController, 'destroy'], [$auth]);

// ------------------ Panel administrativo (auth + admin) ---------------
$router->get('/api/admin/products', [$adminProductController, 'index'], [$auth, $admin]);
$router->get('/api/admin/products/{id}', [$adminProductController, 'show'], [$auth, $admin]);
$router->post('/api/admin/products', [$adminProductController, 'store'], [$auth, $admin]);
$router->put('/api/admin/products/{id}', [$adminProductController, 'update'], [$auth, $admin]);
$router->delete('/api/admin/products/{id}', [$adminProductController, 'destroy'], [$auth, $admin]);
$router->post('/api/admin/products/{id}/images', [$adminProductController, 'addImage'], [$auth, $admin]);
$router->delete('/api/admin/products/images/{imageId}', [$adminProductController, 'removeImage'], [$auth, $admin]);
$router->post('/api/admin/products/{id}/variants', [$adminProductController, 'addVariant'], [$auth, $admin]);
$router->put('/api/admin/products/variants/{variantId}', [$adminProductController, 'updateVariant'], [$auth, $admin]);
$router->delete('/api/admin/products/variants/{variantId}', [$adminProductController, 'deleteVariant'], [$auth, $admin]);

$router->get('/api/admin/categories', [$adminCategoryController, 'index'], [$auth, $admin]);
$router->post('/api/admin/categories', [$adminCategoryController, 'store'], [$auth, $admin]);
$router->put('/api/admin/categories/{id}', [$adminCategoryController, 'update'], [$auth, $admin]);
$router->delete('/api/admin/categories/{id}', [$adminCategoryController, 'destroy'], [$auth, $admin]);

$router->get('/api/admin/brands', [$adminBrandController, 'index'], [$auth, $admin]);
$router->post('/api/admin/brands', [$adminBrandController, 'store'], [$auth, $admin]);
$router->put('/api/admin/brands/{id}', [$adminBrandController, 'update'], [$auth, $admin]);
$router->delete('/api/admin/brands/{id}', [$adminBrandController, 'destroy'], [$auth, $admin]);

$router->get('/api/admin/users', [$adminUserController, 'index'], [$auth, $admin]);
$router->put('/api/admin/users/{id}/status', [$adminUserController, 'updateStatus'], [$auth, $admin]);
$router->put('/api/admin/users/{id}/role', [$adminUserController, 'updateRole'], [$auth, $admin]);
$router->delete('/api/admin/users/{id}', [$adminUserController, 'destroy'], [$auth, $admin]);

$router->get('/api/admin/orders', [$adminOrderController, 'index'], [$auth, $admin]);
$router->get('/api/admin/orders/{id}', [$adminOrderController, 'show'], [$auth, $admin]);
$router->put('/api/admin/orders/{id}/status', [$adminOrderController, 'updateStatus'], [$auth, $admin]);

$router->get('/api/admin/inventory', [$adminInventoryController, 'index'], [$auth, $admin]);
$router->get('/api/admin/inventory/low-stock', [$adminInventoryController, 'lowStock'], [$auth, $admin]);
$router->post('/api/admin/inventory', [$adminInventoryController, 'store'], [$auth, $admin]);

$router->get('/api/admin/promotions', [$adminPromotionController, 'index'], [$auth, $admin]);
$router->post('/api/admin/promotions', [$adminPromotionController, 'store'], [$auth, $admin]);
$router->put('/api/admin/promotions/{id}', [$adminPromotionController, 'update'], [$auth, $admin]);
$router->delete('/api/admin/promotions/{id}', [$adminPromotionController, 'destroy'], [$auth, $admin]);

// ---- Despacho ----------------------------------------------------------
$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
