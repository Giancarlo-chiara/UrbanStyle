<?php

namespace App\Services;

use App\Repositories\BrandRepository;

class BrandService
{
    public function __construct(private BrandRepository $brands)
    {
    }

    private function slugify(string $text): string
    {
        $text = strtolower($text);
        $text = preg_replace('/[^a-z0-9]+/', '-', $text);
        return trim($text, '-');
    }

    public function list(bool $soloActivos = true): array
    {
        return $this->brands->findAll($soloActivos);
    }

    public function create(array $data): int
    {
        $data['slug'] = $data['slug'] ?? $this->slugify($data['name']);
        return $this->brands->create($data);
    }

    public function update(int $id, array $data): bool
    {
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = $this->slugify($data['name']);
        }
        return $this->brands->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->brands->delete($id);
    }
}
