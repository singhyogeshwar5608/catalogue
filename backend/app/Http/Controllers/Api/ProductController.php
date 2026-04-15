<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Support\NextCatalogCacheInvalidate;
use App\Support\ProductImageStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    public function publicProductImage(Product $product)
    {
        $rawImage = $product->getRawOriginal('image');
        $relative = ProductImageStorage::relativeManagedPath(is_string($rawImage) ? $rawImage : null);
        if (! is_string($relative) || $relative === '') {
            return response()->json(['message' => 'Product image not found.'], 404);
        }

        if (! Storage::disk(ProductImageStorage::DISK)->exists($relative)) {
            return response()->json(['message' => 'Product image file missing.'], 404);
        }

        $absolute = Storage::disk(ProductImageStorage::DISK)->path($relative);
        $mime = Storage::disk(ProductImageStorage::DISK)->mimeType($relative) ?: 'application/octet-stream';

        return response()->file($absolute, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function addProduct(Request $request)
    {
        $user = $request->user();
        $requestedStoreId = $request->input('store_id');
        $store = $user->stores()
            ->when(is_numeric($requestedStoreId), fn ($query) => $query->whereKey((int) $requestedStoreId))
            ->first();

        if (! $store) {
            return $this->errorResponse('You must create a store before adding products.', 409);
        }

        if ($store->isPublicCatalogLocked()) {
            return $this->errorResponse(
                'Your store catalog is paused until you renew your plan. You can still use the dashboard, but new products cannot be added yet.',
                403
            );
        }

        $validator = Validator::make($request->all(), [
            'store_id' => 'nullable|integer|exists:stores,id',
            'title' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'category' => 'nullable|string|max:255',
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
            'images' => 'nullable|array',
            'images.*' => 'nullable|string|max:4000000',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if ($request->hasFile('image')) {
            $imgValidator = Validator::make(
                ['image' => $request->file('image')],
                ['image' => 'required|image|max:5120']
            );
            if ($imgValidator->fails()) {
                return $this->errorResponse('Validation failed.', 422, $imgValidator->errors());
            }
        } elseif ($request->filled('image')) {
            $imgValidator = Validator::make(
                ['image' => $request->input('image')],
                ['image' => 'string|max:4000000']
            );
            if ($imgValidator->fails()) {
                return $this->errorResponse('Validation failed.', 422, $imgValidator->errors());
            }
        }

        $data = $validator->validated();
        unset($data['images']);

        $data['image'] = $this->resolveIncomingPrimaryImage($request, null);
        if ($request->has('images')) {
            $data['images'] = $this->normalizeImagesArrayForPersistence($request->input('images', []));
        }

        $product = $store->products()->create($data);

        $this->bumpStoreProductListCache((int) $store->id);
        NextCatalogCacheInvalidate::products();

        $fresh = $product->fresh();
        if ($fresh) {
            ProductImageStorage::decorateProductForResponse($fresh);
        }

        return $this->successResponse('Product created successfully.', $fresh);
    }

    public function updateProduct(Request $request, int $id)
    {
        $product = Product::query()->find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        if ($request->user()->id !== $product->store->user_id) {
            return $this->errorResponse('You are not authorized to update this product.', 403);
        }

        $product->loadMissing('store');
        if ($product->store->isPublicCatalogLocked()) {
            return $this->errorResponse(
                'Your store catalog is paused until you renew your plan. Product updates are not available yet.',
                403
            );
        }

        $previousImage = $product->getAttributes()['image'] ?? null;

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'category' => 'nullable|string|max:255',
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
            'images' => 'nullable|array',
            'images.*' => 'nullable|string|max:4000000',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if ($request->hasFile('image')) {
            $imgValidator = Validator::make(
                ['image' => $request->file('image')],
                ['image' => 'required|image|max:5120']
            );
            if ($imgValidator->fails()) {
                return $this->errorResponse('Validation failed.', 422, $imgValidator->errors());
            }
        } elseif ($request->exists('image') && $request->input('image') !== null && $request->input('image') !== '') {
            $imgValidator = Validator::make(
                ['image' => $request->input('image')],
                ['image' => 'string|max:4000000']
            );
            if ($imgValidator->fails()) {
                return $this->errorResponse('Validation failed.', 422, $imgValidator->errors());
            }
        }

        $data = $validator->validated();

        if (array_key_exists('images', $data)) {
            $data['images'] = $this->normalizeImagesArrayForPersistence($request->input('images', []));
        }

        if ($request->hasFile('image')) {
            $data['image'] = ProductImageStorage::storeUploaded($request->file('image'));
            ProductImageStorage::deleteStoredIfManaged($previousImage);
        } elseif ($request->exists('image')) {
            $raw = $request->input('image');
            if ($raw === null || $raw === '') {
                ProductImageStorage::deleteStoredIfManaged($previousImage);
                $data['image'] = null;
            } else {
                $data['image'] = ProductImageStorage::persistIncomingImage(
                    is_string($raw) ? $raw : '',
                    $previousImage
                );
            }
        }

        $product->update($data);

        $this->bumpStoreProductListCache((int) $product->store_id);
        NextCatalogCacheInvalidate::products();

        $fresh = $product->fresh();
        if ($fresh) {
            ProductImageStorage::decorateProductForResponse($fresh);
        }

        return $this->successResponse('Product updated successfully.', $fresh);
    }

    public function deleteProduct(Request $request, int $id)
    {
        $product = Product::query()->find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        if ($request->user()->id !== $product->store->user_id) {
            return $this->errorResponse('You are not authorized to delete this product.', 403);
        }

        $storeId = (int) $product->store_id;
        $prevImage = $product->getAttributes()['image'] ?? null;
        ProductImageStorage::deleteStoredIfManaged($prevImage);

        $product->delete();

        $this->bumpStoreProductListCache($storeId);
        NextCatalogCacheInvalidate::products();

        return $this->successResponse('Product deleted successfully.');
    }

    /**
     * Paginated, cached product list with explicit column selection and public image URLs.
     */
    public function getProductsByStore(Request $request, int $storeId)
    {
        $store = Store::query()->find($storeId);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $page = max(1, (int) $request->query('page', 1));
        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min(100, $perPage));

        $version = 0;
        $storeCacheRow = Store::query()->select(['id', 'updated_at'])->whereKey($storeId)->first();
        if (Schema::hasColumn('stores', 'product_list_cache_version') && $storeCacheRow) {
            $version = (int) (Store::query()->whereKey($storeId)->value('product_list_cache_version') ?? 0);
        }
        $updatedToken = $storeCacheRow?->updated_at?->timestamp ?? 0;

        $cacheKey = "products:store:{$storeId}:v{$version}:u{$updatedToken}:page:{$page}:per:{$perPage}";

        $paginator = Cache::remember($cacheKey, 60, function () use ($storeId, $page, $perPage) {
            $p = Product::query()
                ->select(Product::LIST_COLUMNS)
                ->where('store_id', $storeId)
                ->orderByDesc('created_at')
                ->paginate($perPage, ['*'], 'page', $page);

            $p->getCollection()->transform(function (Product $product) {
                ProductImageStorage::decorateProductForResponse($product);

                return $product;
            });

            return $p;
        });

        return $this->successResponse('Products retrieved successfully.', $paginator);
    }

    public function getProductById(Request $request, int $id)
    {
        $storeWith = ['store.category'];
        if (Schema::hasTable('store_subscriptions') && Schema::hasTable('subscription_plans')) {
            $storeWith[] = 'store.activeSubscription.plan';
        }

        $product = Product::query()
            ->select(Product::LIST_COLUMNS)
            ->with($storeWith)
            ->find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        ProductImageStorage::decorateProductForResponse($product);

        $payload = $product->toArray();
        $payload['checkout'] = ProductCheckoutController::buildPublicCheckoutPayload($product, $request);

        return $this->successResponse('Product retrieved successfully.', $payload);
    }

    private function bumpStoreProductListCache(int $storeId): void
    {
        // Always touch store updated_at so cache keys invalidate even on environments
        // where `product_list_cache_version` migration is not deployed yet.
        Store::query()->whereKey($storeId)->update(['updated_at' => now()]);

        if (! Schema::hasColumn('stores', 'product_list_cache_version')) {
            return;
        }
        Store::query()->whereKey($storeId)->increment('product_list_cache_version');
    }

    private function resolveIncomingPrimaryImage(Request $request, ?string $previous): ?string
    {
        if ($request->hasFile('image')) {
            return ProductImageStorage::storeUploaded($request->file('image'));
        }
        if ($request->filled('image')) {
            return ProductImageStorage::persistIncomingImage($request->string('image')->toString(), $previous);
        }

        return null;
    }

    /**
     * @param  array<int, mixed>  $images
     * @return array<int, string>
     */
    private function normalizeImagesArrayForPersistence(array $images): array
    {
        $out = [];
        foreach ($images as $item) {
            if (! is_string($item)) {
                continue;
            }
            $trimmed = trim($item);
            if ($trimmed === '') {
                continue;
            }
            $saved = ProductImageStorage::persistIncomingImage($trimmed, null);
            if ($saved !== null) {
                $out[] = $saved;
            }
        }

        return array_values($out);
    }
}
