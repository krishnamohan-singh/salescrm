<?php

namespace App\Imports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\Importable;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ProductImport implements ToModel, WithHeadingRow
{
    use Importable;

    private $addedCount = 0;
    private $skippedCount = 0;

    public function model(array $row)
    {
        // Skip if name is empty
        if (empty($row['name'])) {
            $this->skippedCount++;
            return null;
        }

        // Category is required
        $categoryId = null;
        if (!empty($row['category'])) {
            $category = \App\Models\Category::where('name', $row['category'])
                ->where('created_by', createdBy())
                ->first();
            if ($category) {
                $categoryId = $category->id;
            }
        }
        if (!$categoryId) {
            $this->skippedCount++;
            return null;
        }

        // Check for duplicate SKU if SKU is provided
        $sku = !empty($row['sku']) ? trim($row['sku']) : null;
        if ($sku) {
            $productBySku = Product::where('sku', $sku)->where('created_by', createdBy())->first();
            if ($productBySku) {
                $this->skippedCount++;
                return null;
            }
        }

        $productData = [
            'name' => $row['name'] ?? '',
            'sku' => $sku,
            'description' => $row['description'] ?? null,
            'price' => is_numeric($row['price'] ?? null) ? (float)$row['price'] : 0,
            'stock_quantity' => is_numeric($row['stock'] ?? null) ? (int)$row['stock'] : 0,
            'category_id' => $categoryId,
            'status' => in_array($row['status'] ?? 'active', ['active', 'inactive']) ? $row['status'] : 'active',
            'created_by' => createdBy(),
        ];

        // Brand (optional)
        if (!empty($row['brand'])) {
            $brand = \App\Models\Brand::where('name', $row['brand'])
                ->where('created_by', createdBy())
                ->first();
            if ($brand) {
                $productData['brand_id'] = $brand->id;
            }
        }

        // Tax (optional)
        $taxValue = trim($row['tax'] ?? '');
        if (!empty($taxValue)) {
            $tax = \App\Models\Tax::where('name', $taxValue)->where('created_by', createdBy())->first();
            if ($tax) {
                $productData['tax_id'] = $tax->id;
            }
        }

        $this->addedCount++;
        return new Product($productData);
    }

    public function getAddedCount()
    {
        return $this->addedCount;
    }

    public function getSkippedCount()
    {
        return $this->skippedCount;
    }
}
