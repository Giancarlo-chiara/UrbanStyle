<?php

namespace App\Services;

use App\Repositories\CategoryRepository;

class CategoryService
{
    public function __construct(private CategoryRepository $categories)
    {
    }

    public function list(bool $soloActivos = true): array
    {
        return $this->categories->findAll($soloActivos);
    }

    private function slugify(string $text): string
    {
        $text = strtolower($text);
        $map = ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n'];
        $text = strtr($text, $map);
        $text = preg_replace('/[^a-z0-9]+/', '-', $text);
        return trim($text, '-');
    }

    public function create(array $data): int
    {
        $data['slug'] = $data['slug'] ?? $this->slugify($data['name']);
        return $this->categories->create($data);
    }

    public function update(int $id, array $data): bool
    {
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = $this->slugify($data['name']);
        }
        return $this->categories->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->categories->delete($id);
    }
}
