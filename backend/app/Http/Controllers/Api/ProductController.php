<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    public function addProduct(Request $request)
    {
        $user = $request->user();
        $store = $user->stores()->first();

        if (! $store) {
            return $this->errorResponse('You must create a store before adding products.', 409);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'category' => 'nullable|string|max:255',
            'image' => 'nullable|string|max:4000000',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'unit_type' => 'nullable|string|max:50',
            'unit_custom_label' => 'nullable|string|max:100',
            'unit_quantity' => 'nullable|numeric|min:0',
            'wholesale_enabled' => 'nullable|boolean',
            'wholesale_price' => 'nullable|numeric|min:0',
            'wholesale_min_qty' => 'nullable|integer|min:1',
            'min_order_quantity' => 'nullable|integer|min:1',
            'discount_enabled' => 'nullable|boolean',
            'discount_price' => 'nullable|numeric|min:0',
            'discount_schedule_enabled' => 'nullable|boolean',
            'discount_starts_at' => 'nullable|date',
            'discount_ends_at' => 'nullable|date|after_or_equal:discount_starts_at',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $product = $store->products()->create($validator->validated());

        return $this->successResponse('Product created successfully.', $product->fresh());
    }

    public function updateProduct(Request $request, int $id)
    {
        $product = Product::find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        if ($request->user()->id !== $product->store->user_id) {
            return $this->errorResponse('You are not authorized to update this product.', 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'category' => 'nullable|string|max:255',
            'image' => 'nullable|string|max:4000000',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'unit_type' => 'nullable|string|max:50',
            'unit_custom_label' => 'nullable|string|max:100',
            'unit_quantity' => 'nullable|numeric|min:0',
            'wholesale_enabled' => 'nullable|boolean',
            'wholesale_price' => 'nullable|numeric|min:0',
            'wholesale_min_qty' => 'nullable|integer|min:1',
            'min_order_quantity' => 'nullable|integer|min:1',
            'discount_enabled' => 'nullable|boolean',
            'discount_price' => 'nullable|numeric|min:0',
            'discount_schedule_enabled' => 'nullable|boolean',
            'discount_starts_at' => 'nullable|date',
            'discount_ends_at' => 'nullable|date|after_or_equal:discount_starts_at',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $product->update($validator->validated());

        return $this->successResponse('Product updated successfully.', $product->fresh());
    }

    public function deleteProduct(Request $request, int $id)
    {
        $product = Product::find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        if ($request->user()->id !== $product->store->user_id) {
            return $this->errorResponse('You are not authorized to delete this product.', 403);
        }

        $product->delete();

        return $this->successResponse('Product deleted successfully.');
    }

    public function getProductsByStore(int $storeId)
    {
        $store = Store::find($storeId);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $products = $store->products()->orderByDesc('created_at')->get();

        return $this->successResponse('Products retrieved successfully.', $products);
    }

    public function getProductById(int $id)
    {
        $product = Product::with('store')->find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        return $this->successResponse('Product retrieved successfully.', $product);
    }
}
