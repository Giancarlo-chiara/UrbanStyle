<?php

namespace App\Services;

use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;
use App\Repositories\PromotionRepository;

class OrderService
{
    /** Tope de unidades por línea de pedido. */
    public const MAX_UNIDADES_POR_LINEA = 20;

    /** Política de envío. Si cambias esto, cambia también ENVIO en ecommerce/src/config/negocio.js */
    public const ENVIO_COSTO = 15.0;
    public const ENVIO_GRATIS_DESDE = 200.0;

    public function __construct(
        private OrderRepository $orders,
        private ProductRepository $products,
        private PromotionRepository $promotions
    ) {
    }

    /**
     * $payload = ['address_id' => ?, 'payment_method' => ?, 'promotion_code' => ?,
     *             'items' => [ ['product_id' => .., 'variant_id' => .., 'quantity' => ..], ... ] ]
     */
    public function checkout(int $userId, array $payload): array
    {
        if (empty($payload['items']) || !is_array($payload['items'])) {
            throw new \RuntimeException('El carrito está vacío.');
        }

        $subtotal = 0;
        $orderItems = [];
        // Consolida líneas repetidas (mismo producto + misma variante) para que
        // la comprobación de stock se haga una sola vez sobre la cantidad total.
        $pedidoPorVariante = [];

        foreach ($payload['items'] as $item) {
            if (!is_array($item) || empty($item['product_id'])) {
                throw new \RuntimeException('El carrito contiene una línea inválida.');
            }

            $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
            if ($quantity === false || $quantity < 1) {
                throw new \RuntimeException('La cantidad de cada producto debe ser un entero mayor que 0.');
            }
            if ($quantity > self::MAX_UNIDADES_POR_LINEA) {
                throw new \RuntimeException('La cantidad máxima por producto es ' . self::MAX_UNIDADES_POR_LINEA . '.');
            }

            $product = $this->products->findById((int)$item['product_id']);
            if (!$product) {
                throw new \RuntimeException("Producto {$item['product_id']} no existe.");
            }
            if (($product['status'] ?? '') !== 'activo') {
                throw new \RuntimeException("El producto \"{$product['name']}\" no está disponible.");
            }

            $variant = null;
            $tieneVariantes = !empty($product['variants']);

            if (!empty($item['variant_id'])) {
                $variant = $this->products->findVariantById((int)$item['variant_id']);
                if (!$variant) {
                    throw new \RuntimeException("La variante seleccionada para \"{$product['name']}\" no existe.");
                }
                // La variante DEBE pertenecer al producto de la línea: sin esta
                // comprobación se podía cobrar un producto y descontar el stock de otro.
                if ((int)$variant['product_id'] !== (int)$product['id']) {
                    throw new \RuntimeException("La variante seleccionada no corresponde a \"{$product['name']}\".");
                }

                $acumulada = ($pedidoPorVariante[$variant['id']] ?? 0) + $quantity;
                if ($variant['stock'] < $acumulada) {
                    throw new \RuntimeException("Stock insuficiente para {$product['name']} (talla {$variant['size']}).");
                }
                $pedidoPorVariante[$variant['id']] = $acumulada;
            } elseif ($tieneVariantes) {
                // Sin variant_id no había ni validación ni descuento de stock:
                // se podía comprar cualquier cantidad de un producto agotado.
                throw new \RuntimeException("Debes elegir una talla para \"{$product['name']}\".");
            }

            $unitPrice = (float)$product['final_price'];
            $lineSubtotal = round($unitPrice * $quantity, 2);
            $subtotal += $lineSubtotal;

            $orderItems[] = [
                'product_id' => $product['id'],
                'variant_id' => $variant['id'] ?? null,
                'name' => $product['name'],
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'subtotal' => $lineSubtotal,
            ];
        }

        $discountTotal = 0;
        if (!empty($payload['promotion_code'])) {
            $promo = $this->promotions->findActiveByCode($payload['promotion_code']);
            if ($promo) {
                if ($promo['discount_percent']) {
                    $discountTotal = round($subtotal * ((float)$promo['discount_percent'] / 100), 2);
                } elseif ($promo['discount_amount']) {
                    $discountTotal = min($subtotal, (float)$promo['discount_amount']);
                }
            }
        }

        $shippingCost = ($subtotal - $discountTotal) >= self::ENVIO_GRATIS_DESDE ? 0.0 : self::ENVIO_COSTO;
        $total = round($subtotal - $discountTotal + $shippingCost, 2);

        $orderId = $this->orders->create([
            'user_id' => $userId,
            'address_id' => $payload['address_id'] ?? null,
            'subtotal' => $subtotal,
            'discount_total' => $discountTotal,
            'shipping_cost' => $shippingCost,
            'total' => $total,
            'payment_method' => $payload['payment_method'] ?? 'tarjeta',
            'promotion_code' => $payload['promotion_code'] ?? null,
        ], $orderItems);

        return $this->orders->findById($orderId);
    }

    public function listByUser(int $userId): array
    {
        return $this->orders->findByUser($userId);
    }

    public function findById(int $id): ?array
    {
        return $this->orders->findById($id);
    }

    public function listAll(): array
    {
        return $this->orders->findAll();
    }

    public function updateStatus(int $id, string $status, ?string $note = null): bool
    {
        return $this->orders->updateStatus($id, $status, $note);
    }
}
