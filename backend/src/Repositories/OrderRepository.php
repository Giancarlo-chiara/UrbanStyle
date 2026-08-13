<?php

namespace App\Repositories;

use PDO;

class OrderRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function create(array $order, array $items): int
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO orders (user_id, address_id, subtotal, discount_total, shipping_cost, total, payment_method, promotion_code, status)
                 VALUES (:user_id, :address_id, :subtotal, :discount_total, :shipping_cost, :total, :payment_method, :promotion_code, 'pendiente')
                 RETURNING id"
            );
            $stmt->execute([
                'user_id' => $order['user_id'],
                'address_id' => $order['address_id'] ?? null,
                'subtotal' => $order['subtotal'],
                'discount_total' => $order['discount_total'] ?? 0,
                'shipping_cost' => $order['shipping_cost'] ?? 0,
                'total' => $order['total'],
                'payment_method' => $order['payment_method'] ?? 'tarjeta',
                'promotion_code' => $order['promotion_code'] ?? null,
            ]);
            $orderId = (int)$stmt->fetchColumn();

            $itemStmt = $this->db->prepare(
                "INSERT INTO order_items (order_id, product_id, variant_id, product_name_snapshot, unit_price, quantity, subtotal)
                 VALUES (:order_id, :product_id, :variant_id, :name, :unit_price, :quantity, :subtotal)"
            );
            $stockStmt = $this->db->prepare(
                "UPDATE product_variants SET stock = stock - :qty WHERE id = :variant_id AND stock >= :qty"
            );

            foreach ($items as $item) {
                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'] ?? null,
                    'name' => $item['name'],
                    'unit_price' => $item['unit_price'],
                    'quantity' => $item['quantity'],
                    'subtotal' => $item['subtotal'],
                ]);

                if (!empty($item['variant_id'])) {
                    $stockStmt->execute(['qty' => $item['quantity'], 'variant_id' => $item['variant_id']]);
                    // La guarda "AND stock >= :qty" evita el stock negativo, pero si otra
                    // compra vació la variante entre la validación y este UPDATE, afecta
                    // 0 filas y antes el pedido se confirmaba igual: sobreventa silenciosa.
                    if ($stockStmt->rowCount() === 0) {
                        throw new \RuntimeException(
                            "El stock de \"{$item['name']}\" se agotó mientras confirmábamos tu pedido."
                        );
                    }
                }
            }

            $historyStmt = $this->db->prepare(
                "INSERT INTO order_status_history (order_id, status, note) VALUES (:order_id, 'pendiente', 'Pedido creado')"
            );
            $historyStmt->execute(['order_id' => $orderId]);

            $this->db->commit();
            return $orderId;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function findByUser(int $userId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, subtotal, discount_total, shipping_cost, total, status, payment_method, created_at
             FROM orders WHERE user_id = :user_id ORDER BY created_at DESC"
        );
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM orders WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $order = $stmt->fetch();
        if (!$order) return null;

        $itemsStmt = $this->db->prepare("SELECT * FROM order_items WHERE order_id = :id");
        $itemsStmt->execute(['id' => $id]);
        $order['items'] = $itemsStmt->fetchAll();

        return $order;
    }

    // ---------------- Administración ----------------
    public function findAll(): array
    {
        $stmt = $this->db->query(
            "SELECT o.id, o.total, o.status, o.created_at, u.full_name AS customer_name, u.email AS customer_email
             FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC"
        );
        return $stmt->fetchAll();
    }

    public function updateStatus(int $id, string $status, ?string $note = null): bool
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("UPDATE orders SET status = :status WHERE id = :id");
            $stmt->execute(['status' => $status, 'id' => $id]);

            $hist = $this->db->prepare(
                "INSERT INTO order_status_history (order_id, status, note) VALUES (:id, :status, :note)"
            );
            $hist->execute(['id' => $id, 'status' => $status, 'note' => $note]);

            $this->db->commit();
            return true;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
