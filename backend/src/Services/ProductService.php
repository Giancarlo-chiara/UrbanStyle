<?php

namespace App\Services;

use App\Repositories\ProductRepository;

class ProductService
{
    public function __construct(private ProductRepository $products)
    {
    }

    public function list(array $filters, bool $incluirInactivos = false): array
    {
        $items = $this->products->findAll($filters, $incluirInactivos);
        $total = $this->products->countAll($filters, $incluirInactivos);
        // Mismo acotado que aplica el repositorio, para que la paginación cuadre.
        $limit = min(100, max(1, (int)($filters['limit'] ?? 24)));

        return [
            'items' => $items,
            'pagination' => [
                'page' => max(1, (int)($filters['page'] ?? 1)),
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int)ceil($total / $limit),
            ],
        ];
    }

    public function findById(int $id): ?array
    {
        return $this->products->findById($id);
    }

    public function sizes(): array
    {
        return $this->products->findSizes();
    }

    public function related(int $id): array
    {
        $product = $this->products->findById($id);
        if (!$product) {
            return [];
        }
        return $this->products->findRelated($id, (int)$product['category_id']);
    }

    private function slugify(string $text): string
    {
        $text = strtolower($text);
        $text = preg_replace('/[áàäâ]/u', 'a', $text);
        $text = preg_replace('/[éèëê]/u', 'e', $text);
        $text = preg_replace('/[íìïî]/u', 'i', $text);
        $text = preg_replace('/[óòöô]/u', 'o', $text);
        $text = preg_replace('/[úùüû]/u', 'u', $text);
        $text = preg_replace('/ñ/u', 'n', $text);
        $text = preg_replace('/[^a-z0-9]+/', '-', $text);
        return trim($text, '-') . '-' . substr(uniqid(), -5);
    }

    public function create(array $data): int
    {
        $data['slug'] = $this->slugify($data['name']);
        $productId = $this->products->create($data);

        if (!empty($data['images']) && is_array($data['images'])) {
            foreach ($data['images'] as $i => $url) {
                $this->products->addImage($productId, $url, $i === 0, $i);
            }
        }
        if (!empty($data['variants']) && is_array($data['variants'])) {
            foreach ($data['variants'] as $variant) {
                $this->products->addVariant(
                    $productId,
                    $variant['size'] ?? 'Única',
                    $variant['color'] ?? 'Estándar',
                    $variant['sku'] ?? null,
                    (int)($variant['stock'] ?? 0)
                );
            }
        }

        return $productId;
    }

    public function update(int $id, array $data): bool
    {
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = $this->slugify($data['name']);
        }
        return $this->products->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->products->delete($id);
    }

    public function addImage(int $productId, string $url, bool $isPrimary = false): int
    {
        return $this->products->addImage($productId, $url, $isPrimary);
    }

    public function removeImage(int $imageId): bool
    {
        return $this->products->removeImage($imageId);
    }

    public function addVariant(int $productId, array $variant): int
    {
        return $this->products->addVariant(
            $productId,
            $variant['size'] ?? 'Única',
            $variant['color'] ?? 'Estándar',
            $variant['sku'] ?? null,
            (int)($variant['stock'] ?? 0)
        );
    }

    public function updateVariantStock(int $variantId, int $stock): bool
    {
        return $this->products->updateVariantStock($variantId, $stock);
    }

    public function deleteVariant(int $variantId): bool
    {
        return $this->products->deleteVariant($variantId);
    }
}
