<?php

namespace App\Repositories;

use PDO;

class InventoryRepository
{
    public function __construct(private PDO $db)
    {
    }

    public function findAll(): array
    {
        $stmt = $this->db->query(
            "SELECT im.id, im.type, im.quantity, im.reason, im.created_at,
                    pv.size, pv.color, pv.sku, pv.stock AS current_stock,
                    p.name AS product_name, p.id AS product_id,
                    u.full_name AS created_by_name
             FROM inventory_movements im
             JOIN product_variants pv ON pv.id = im.variant_id
             JOIN products p ON p.id = pv.product_id
             LEFT JOIN users u ON u.id = im.created_by
             ORDER BY im.created_at DESC LIMIT 200"
        );
        return $stmt->fetchAll();
    }

    public function register(int $variantId, string $type, int $quantity, ?string $reason, ?int $createdBy): int
    {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO inventory_movements (variant_id, type, quantity, reason, created_by)
                 VALUES (:variant_id, :type, :quantity, :reason, :created_by) RETURNING id"
            );
            $stmt->execute([
                'variant_id' => $variantId,
                'type' => $type,
                'quantity' => $quantity,
                'reason' => $reason,
                'created_by' => $createdBy,
            ]);
            $id = (int)$stmt->fetchColumn();

            // 'entrada' suma, 'salida' resta y 'ajuste' FIJA el stock al valor indicado
            // (antes 'ajuste' sumaba igual que 'entrada', contradiciendo su nombre).
            if ($type === 'ajuste') {
                $update = $this->db->prepare(
                    "UPDATE product_variants SET stock = :stock WHERE id = :id"
                );
                $update->execute(['stock' => max(0, $quantity), 'id' => $variantId]);
            } else {
                $delta = $type === 'salida' ? -$quantity : $quantity;
                $update = $this->db->prepare(
                    "UPDATE product_variants SET stock = GREATEST(0, stock + :delta) WHERE id = :id"
                );
                $update->execute(['delta' => $delta, 'id' => $variantId]);
            }

            $this->db->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function lowStock(int $threshold = 5): array
    {
        $stmt = $this->db->prepare(
            "SELECT pv.id AS variant_id, pv.size, pv.color, pv.stock, p.id AS product_id, p.name AS product_name
             FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             WHERE pv.stock <= :threshold
             ORDER BY pv.stock ASC"
        );
        $stmt->execute(['threshold' => $threshold]);
        return $stmt->fetchAll();
    }
}
