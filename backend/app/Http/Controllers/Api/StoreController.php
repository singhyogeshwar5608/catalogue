<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class StoreController extends Controller
{
    public function listStores(Request $request)
    {
        $limit = (int) $request->integer('limit', 50);
        $limit = max(1, min(100, $limit));

        try {
            return $this->listStoresFull($request, $limit);
        } catch (\Throwable $e) {
            Log::error('listStores failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return $this->listStoresMinimalFallback($limit);
        }
    }

    /**
     * Full listing with relations (fails on hosts missing tables/columns).
     */
    private function listStoresFull(Request $request, int $limit): \Illuminate\Http\JsonResponse
    {
        $storeTable = (new Store)->getTable();
        $storeCols = array_flip(Schema::getColumnListing($storeTable));
        $hasCol = static fn (string $c): bool => isset($storeCols[$c]);

        $query = Store::query();

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search, $hasCol) {
                $q->where('name', 'like', "%{$search}%");
                if ($hasCol('slug')) {
                    $q->orWhere('slug', 'like', "%{$search}%");
                }
                if ($hasCol('location')) {
                    $q->orWhere('location', 'like', "%{$search}%");
                }
                if ($hasCol('category_id')) {
                    $q->orWhereHas('category', function ($categoryQuery) use ($search) {
                        $categoryQuery->where('name', 'like', "%{$search}%");
                    });
                }
            });
        }

        if ($request->filled('category') && $hasCol('category_id')) {
            $query->whereHas('category', function ($q) use ($request) {
                $q->where('name', $request->string('category'));
            });
        }

        if ($request->filled('location') && $hasCol('location')) {
            $locationFilter = $request->string('location');
            $query->where('location', 'like', '%' . $locationFilter . '%');
        }

        $hasCoordinatesFilter = $request->filled(['lat', 'lng']) && $hasCol('latitude') && $hasCol('longitude');
        if ($hasCoordinatesFilter) {
            $latitude = (float) $request->input('lat');
            $longitude = (float) $request->input('lng');
            $radius = (float) $request->input('radius_km', 50);
            $radius = max(1, min(200, $radius));

            // Check if we're using SQLite (which doesn't support acos)
            $isSQLite = config('database.default') === 'sqlite';
            
            if ($isSQLite) {
                // For SQLite, skip distance calculation and just get active stores with coordinates
                // The frontend will handle distance filtering
                $query->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->select('*');
                if ($hasCol('is_boosted')) {
                    $query->orderBy('is_boosted', 'desc');
                }
                if ($hasCol('boost_expiry_date')) {
                    $query->orderBy('boost_expiry_date', 'desc');
                }
                $query->orderBy('created_at', 'desc');
            } else {
                // For MySQL/PostgreSQL, use proper Haversine formula
                $haversine = "(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))";
                $query->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->selectRaw("{$haversine} as distance_km", [$latitude, $longitude, $latitude])
                    ->having('distance_km', '<=', $radius);
            }
        } else {
            // Do not SELECT huge LONGTEXT columns for listing — avoids OOM before trimHeavy runs.
            $omitHeavy = array_values(array_filter(['logo', 'banner', 'description'], $hasCol));
            $allCols = array_keys($storeCols);
            $slim = array_values(array_diff($allCols, $omitHeavy));
            if (count($slim) >= 3 && in_array('id', $slim, true)) {
                $query->select($slim);
            } else {
                $query->select('*');
            }
        }

        if ($request->boolean('only_verified')) {
            $query->where('is_verified', true);
        }

        if ($request->boolean('only_boosted') && $hasCol('is_boosted')) {
            $query->where('is_boosted', true);
        }

        // For admin panel, show all stores (active + banned)
        // For public API, show only active stores
        $user = $request->user();
        $isAdmin = $user?->role === 'super_admin';
        $includeInactive = $request->boolean('include_inactive', false);
        
        \Log::info('getAllStores called', [
            'user_id' => $user?->id,
            'user_role' => $user?->role,
            'is_admin' => $isAdmin,
            'include_inactive' => $includeInactive,
            'limit' => $request->input('limit', 50)
        ]);
        
        // For admin panel, show all stores (active + banned)
        // For public API, show only active stores
        // Also include inactive stores if explicitly requested
        if (!$isAdmin && !$includeInactive && $hasCol('is_active')) {
            $query->where('is_active', true);
            \Log::info('Filtering active stores only (non-admin user)');
        } else {
            \Log::info('Showing all stores (admin user or include_inactive requested)');
        }

        $hasProductsTable = Schema::hasTable('products');
        $hasServicesTable = Schema::hasTable('services');
        $productHasActive = $hasProductsTable && Schema::hasColumn('products', 'is_active');
        $serviceHasActive = $hasServicesTable && Schema::hasColumn('services', 'is_active');

        $eager = [];
        if ($hasProductsTable) {
            $eager['products'] = function ($q) use ($productHasActive) {
                $q->orderBy('created_at', 'desc')->limit(3);
                if ($productHasActive) {
                    $q->where('is_active', true);
                }
            };
        }
        if ($hasServicesTable) {
            $eager['services'] = function ($q) use ($serviceHasActive) {
                $q->orderBy('created_at', 'desc')->limit(3);
                if ($serviceHasActive) {
                    $q->where('is_active', true);
                }
            };
        }
        if (Schema::hasTable('categories')) {
            $eager['category'] = $this->categoryRelationWithBanners();
        }
        if (Schema::hasTable('users')) {
            $eager[] = Schema::hasColumn('users', 'email')
                ? 'user:id,name,email'
                : 'user:id,name';
        }
        if (Schema::hasTable('store_boosts') && Schema::hasTable('boost_plans')) {
            $eager[] = 'activeBoost.plan';
        }
        if (Schema::hasTable('store_subscriptions') && Schema::hasTable('subscription_plans')) {
            $eager[] = 'activeSubscription.plan';
        }

        $countRelations = array_values(array_filter([
            $hasProductsTable ? 'products' : null,
            $hasServicesTable ? 'services' : null,
        ]));

        // MySQL: selectRaw + having + withCount in one query often breaks ONLY_FULL_GROUP_BY / invalid SQL.
        $deferCounts = $hasCoordinatesFilter && config('database.default') !== 'sqlite' && $countRelations !== [];

        $builder = $query->with($eager);
        if ($countRelations !== [] && ! $deferCounts) {
            $builder->withCount($countRelations);
        }

        $stores = $builder
            ->when($hasCoordinatesFilter, function ($q) use ($hasCol) {
                if (config('database.default') !== 'sqlite') {
                    $q->orderBy('distance_km');
                }
                if ($hasCol('is_boosted')) {
                    $q->orderByDesc('is_boosted');
                }
                if ($hasCol('boost_expiry_date')) {
                    $q->orderByDesc('boost_expiry_date');
                }
            }, function ($q) use ($hasCol) {
                if ($hasCol('is_boosted')) {
                    $q->orderByDesc('is_boosted');
                }
                if ($hasCol('boost_expiry_date')) {
                    $q->orderByDesc('boost_expiry_date');
                }
                $q->latest();
            })
            ->take($limit)
            ->get();

        if ($deferCounts) {
            $stores->loadCount($countRelations);
        }

        try {
            $stores = $this->applyCategoryBannerData($stores);
        } catch (\Throwable $bannerEx) {
            Log::warning('applyCategoryBannerData skipped', ['message' => $bannerEx->getMessage()]);
        }

        $this->trimHeavyPayloadForStoreListing($stores);

        return $this->successResponse('Stores retrieved successfully.', $stores);
    }

    /**
     * Last-resort listing when the full query throws (missing relations, schema drift, etc.).
     */
    private function listStoresMinimalFallback(int $limit): \Illuminate\Http\JsonResponse
    {
        try {
            $storeTable = (new Store)->getTable();
            $activeCol = Schema::hasColumn($storeTable, 'is_active');
            $listed = Schema::getColumnListing($storeTable);
            $slimCols = array_values(array_diff($listed, array_intersect(['logo', 'banner', 'description'], $listed)));

            $stores = Store::query()
                ->when($activeCol, fn ($q) => $q->where('is_active', true))
                ->when(count($slimCols) >= 3 && in_array('id', $slimCols, true), fn ($q) => $q->select($slimCols))
                ->latest()
                ->take($limit)
                ->get();

            $this->trimHeavyPayloadForStoreListing($stores);

            return $this->successResponse('Stores retrieved successfully.', $stores);
        } catch (\Throwable $e) {
            Log::error('listStoresMinimalFallback failed', ['message' => $e->getMessage()]);

            return $this->errorResponse('Unable to load stores.', 503);
        }
    }

    public function myStores(Request $request)
    {
        $user = $request->user();
        \Log::info('myStores called', ['user_id' => $user->id, 'user_email' => $user->email, 'role' => $user->role]);
        
        // For super admin, show all stores
        // For regular users, show only their stores
        if ($user->role === 'super_admin') {
            \Log::info('Executing admin branch - showing all stores');
            $adminEager = [
                'category' => $this->categoryRelationWithBanners(),
                'user',
            ];
            if (Schema::hasTable('store_boosts') && Schema::hasTable('boost_plans')) {
                $adminEager[] = 'activeBoost.plan';
            }
            if (Schema::hasTable('store_subscriptions') && Schema::hasTable('subscription_plans')) {
                $adminEager[] = 'activeSubscription.plan';
            }
            $stores = \App\Models\Store::with($adminEager)
            ->withCount(['products', 'services'])
            ->orderByDesc('created_at')
            ->get();
        } else {
            \Log::info('Executing user branch - showing only user stores');
            $userEager = [
                'category' => $this->categoryRelationWithBanners(),
            ];
            if (Schema::hasTable('store_boosts') && Schema::hasTable('boost_plans')) {
                $userEager[] = 'activeBoost.plan';
            }
            if (Schema::hasTable('store_subscriptions') && Schema::hasTable('subscription_plans')) {
                $userEager[] = 'activeSubscription.plan';
            }
            $stores = $user
                ->stores()
                ->with($userEager)
                ->withCount(['products', 'services'])
                ->orderByDesc('created_at')
                ->get();
        }

        \Log::info('Stores query executed', ['count' => $stores->count()]);
        
        \Log::info('Before applyCategoryBannerData', ['stores' => $stores->pluck('id')->toArray()]);
        $stores = $this->applyCategoryBannerData($stores);
        \Log::info('After applyCategoryBannerData', ['count' => $stores->count(), 'stores' => $stores->pluck('id')->toArray()]);

        \Log::info('Returning user stores', ['count' => $stores->count()]);
        return $this->successResponse('User stores retrieved successfully.', $stores);
    }

    public function createStore(Request $request)
    {
        $user = $request->user();
        \Log::debug('Create store request - LATEST CODE', ['user_id' => $user->id, 'payload' => $request->all()]);

        // Enforce single store per user
        if ($user->stores()->exists()) {
            return $this->errorResponse('You already have a store. Only one store per user is allowed.', 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:stores,slug',
            'category_id' => 'required|exists:categories,id',
            'logo' => 'nullable|string|max:4000000',
            'phone' => 'nullable|string|max:50',
            'email' => 'required|email|max:255',
            'show_phone' => 'nullable|boolean',
            'address' => 'nullable|string',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'facebook_url' => 'nullable|url|max:255',
            'instagram_url' => 'nullable|url|max:255',
            'youtube_url' => 'nullable|url|max:255',
            'linkedin_url' => 'nullable|url|max:255',
        ]);

        if ($validator->fails()) {
            \Log::error('Store validation failed', ['errors' => $validator->errors()->toArray()]);
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();
        $data['slug'] = $this->generateUniqueSlug($data['slug'] ?? Str::slug($data['name']));
        $data['username'] = Str::slug($data['name']) . '-' . $user->id;
        $data['user_id'] = $user->id;

        if ((! isset($data['latitude']) || $data['latitude'] === null) && (! isset($data['longitude']) || $data['longitude'] === null)) {
            $coordinates = $this->geocodeLocation($data['location'] ?? $data['address'] ?? null);
            if ($coordinates) {
                [$data['latitude'], $data['longitude']] = $coordinates;
            }
        }

        $store = Store::create($data);
        
        // Load only basic relationships to avoid SQLite issues
        $store->load(['category']);
        
        // Skip category banner data for now to avoid SQLite issues
        // $store = $this->applyCategoryBannerData($store);

        $category = $store->category;
        $businessType = $category?->business_type ?? 'product';
        $store->update([
            'theme' => match ($businessType) {
                'service' => 'service-default',
                'hybrid' => 'hybrid-default',
                default => 'product-default',
            },
        ]);

        return $this->successResponse('Store created successfully.', [
            'store' => $store,
            'business_type' => $businessType,
        ]);
    }

    public function updateStore(Request $request, int $id)
    {
        $store = Store::find($id);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $user = $request->user();
        if ($user->id !== $store->user_id && $user->role !== 'super_admin') {
            return $this->errorResponse('You are not authorized to update this store.', 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|nullable|string|max:255|unique:stores,slug,' . $store->id,
            'category_id' => 'sometimes|required|exists:categories,id',
            'logo' => 'nullable|string|max:4000000',
            'phone' => 'nullable|string|max:50',
            'email' => 'sometimes|nullable|email|max:255',
            'show_phone' => 'nullable|boolean',
            'address' => 'nullable|string',
            'description' => 'nullable|string',
            'is_verified' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'location' => 'nullable|string|max:255',
            'facebook_url' => 'nullable|url|max:255',
            'instagram_url' => 'nullable|url|max:255',
            'youtube_url' => 'nullable|url|max:255',
            'linkedin_url' => 'nullable|url|max:255',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();

        if (array_key_exists('slug', $data)) {
            $data['slug'] = $this->generateUniqueSlug($data['slug'] ?? Str::slug($data['name'] ?? $store->name), $store->id);
        }

        $hasLocationChange = array_key_exists('location', $data) || array_key_exists('address', $data);
        $coordinatesProvided = array_key_exists('latitude', $data) && array_key_exists('longitude', $data);

        if ($hasLocationChange && ! $coordinatesProvided) {
            $coordinates = $this->geocodeLocation($data['location'] ?? $data['address'] ?? $store->location ?? $store->address);
            if ($coordinates) {
                [$data['latitude'], $data['longitude']] = $coordinates;
            }
        }

        \Log::info('Updating store', ['store_id' => $store->id, 'data' => $data]);
        
        $store->update($data);
        
        \Log::info('Store updated, refreshing data', ['store_id' => $store->id]);
        $store->refresh();
        \Log::info('Store refreshed', ['is_active' => $store->is_active]);

        $store->load([
            'category' => $this->categoryRelationWithBanners(),
            'user',
        ]);
        $store = $this->applyCategoryBannerData($store);

        return $this->successResponse('Store updated successfully.', [
            'store' => $store,
            'business_type' => $store->category?->business_type,
        ]);
    }

    public function getStoreBySlug(string $slug)
    {
        try {
            \Log::info('getStoreBySlug called', ['slug' => $slug]);
            
            $store = Store::where('slug', $slug)->first();
            
            if (! $store) {
                \Log::warning('Store not found', ['slug' => $slug]);
                return $this->errorResponse('Store not found.', 404);
            }

            \Log::info('Store found', ['id' => $store->id, 'name' => $store->name]);

            $toLoad = [
                'category' => $this->categoryRelationWithBanners(),
                'products' => function ($query) {
                    $query->orderByDesc('created_at');
                },
            ];
            if (Schema::hasTable('store_boosts') && Schema::hasTable('boost_plans')) {
                $toLoad[] = 'activeBoost.plan';
            }
            if (Schema::hasTable('store_subscriptions') && Schema::hasTable('subscription_plans')) {
                $toLoad[] = 'activeSubscription.plan';
            }
            try {
                $store->load($toLoad);
                \Log::info('Relationships loaded successfully');
            } catch (\Exception $e) {
                \Log::error('Failed to load relationships: ' . $e->getMessage());
            }

            try {
                $store = $this->applyCategoryBannerData($store);
                \Log::info('Category banner data applied');
            } catch (\Exception $e) {
                \Log::error('Failed to apply category banner data: ' . $e->getMessage());
                // Continue without banner data
            }
            
            \Log::info('Returning store response');
            return $this->successResponse('Store retrieved successfully.', $store);
        } catch (\Exception $e) {
            \Log::error('getStoreBySlug error: ' . $e->getMessage(), [
                'slug' => $slug,
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->errorResponse('Server error while retrieving store.', 500);
        }
    }

    public function deleteStore(Request $request, int $id)
    {
        $store = Store::find($id);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $user = $request->user();
        if ($user->id !== $store->user_id && $user->role !== 'super_admin') {
            return $this->errorResponse('You are not authorized to delete this store.', 403);
        }

        $store->delete();

        return $this->successResponse('Store deleted successfully.');
    }

    private function generateUniqueSlug(string $baseSlug, ?int $ignoreId = null): string
    {
        $slug = Str::slug($baseSlug);
        $original = $slug;
        $counter = 1;

        while (Store::where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $original . '-' . $counter++;
        }

        return $slug;
    }

    /**
     * Shared hosting: listing 50 stores with data-URL base64 logos/banners can exceed memory / JSON limits
     * and return HTTP 500. Strip heavy fields here; store detail routes can still return full rows.
     */
    private function trimHeavyPayloadForStoreListing(Collection $stores): void
    {
        foreach ($stores as $store) {
            if (! $store instanceof Store) {
                continue;
            }

            foreach (['logo', 'banner'] as $attr) {
                $this->nullIfHeavyBinaryString($store, $attr);
            }
            foreach (['description', 'short_description'] as $attr) {
                $this->nullIfHeavyBinaryString($store, $attr, 65536);
            }

            if ($store->relationLoaded('products')) {
                foreach ($store->products as $product) {
                    $this->nullIfHeavyBinaryString($product, 'image');
                    $this->nullIfHeavyBinaryString($product, 'description', 65536);
                    $imgs = $product->getAttribute('images');
                    if (is_array($imgs) && $imgs !== []) {
                        $product->setAttribute('images', []);
                    }
                }
            }

            if ($store->relationLoaded('services')) {
                foreach ($store->services as $service) {
                    $this->nullIfHeavyBinaryString($service, 'image');
                    $this->nullIfHeavyBinaryString($service, 'description', 65536);
                }
            }

            if ($store->relationLoaded('category') && $store->category) {
                $cat = $store->category;
                $this->nullIfHeavyBinaryString($cat, 'banner_image');
                $raw = $cat->getAttribute('banner_images');
                if (is_array($raw) && $raw !== []) {
                    $keep = [];
                    foreach ($raw as $url) {
                        if (! is_string($url) || $url === '') {
                            continue;
                        }
                        if (str_starts_with($url, 'data:') || strlen($url) > 8192) {
                            continue;
                        }
                        $keep[] = $url;
                        if (count($keep) >= 3) {
                            break;
                        }
                    }
                    $cat->setAttribute('banner_images', $keep);
                    if ($keep === []) {
                        $cat->setAttribute('banner_image', null);
                    }
                }
            }
        }
    }

    private function nullIfHeavyBinaryString(object $model, string $attr, int $maxLen = 8192): void
    {
        $v = $model->getAttribute($attr);
        if (! is_string($v) || $v === '') {
            return;
        }
        if (str_starts_with($v, 'data:') || strlen($v) > $maxLen) {
            $model->setAttribute($attr, null);
        }
    }

    private function categoryRelationWithBanners(): Closure
    {
        return function ($query) {
            // Do not use a fixed SELECT list: production DBs may lag migrations
            // (unknown column errors). Load full category rows; optional templates.
            if (Schema::hasTable('banner_templates')) {
                $query->with(['bannerTemplates' => function ($bannerTemplates) {
                    $bannerTemplates->orderBy('id');
                }]);
            }
        };
    }

    private function applyCategoryBannerData(Collection|Store $stores)
    {
        $transform = function (Store $store) {
            if (! $store->relationLoaded('category')) {
                return $store;
            }

            $category = $store->category;
            if (! $category) {
                return $store;
            }

            if ($category->relationLoaded('bannerTemplates')) {
                $rawImages = $category->banner_images ?? [];
                if (! is_array($rawImages)) {
                    $rawImages = [];
                }
                $bannerImages = collect($rawImages)
                    ->filter(fn ($url) => filled($url) && is_string($url))
                    ->values();

                if ($bannerImages->isNotEmpty()) {
                    $category->setAttribute('banner_images', $bannerImages->all());
                    $category->setAttribute('banner_image', $bannerImages->first());
                }

                $category->unsetRelation('bannerTemplates');
            }

            return $store;
        };

        if ($stores instanceof Store) {
            return $transform($stores);
        }

        return $stores->map(fn ($store) => $transform($store));
    }

    private function geocodeLocation(?string $query): ?array
    {
        if (! $query) {
            return null;
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'User-Agent' => 'CatelogApp/1.0 (contact: support@catelog.local)'
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'format' => 'json',
                    'limit' => 1,
                    'q' => $query,
                ]);

            if (! $response->successful()) {
                Log::warning('Geocoding failed', ['query' => $query, 'status' => $response->status()]);
                return null;
            }

            $data = $response->json();
            if (! is_array($data) || empty($data[0]['lat']) || empty($data[0]['lon'])) {
                return null;
            }

            return [
                (float) $data[0]['lat'],
                (float) $data[0]['lon'],
            ];
        } catch (\Throwable $exception) {
            Log::warning('Geocoding exception', ['query' => $query, 'message' => $exception->getMessage()]);
            return null;
        }
    }
}
