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
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class StoreController extends Controller
{
    public function listStores(Request $request)
    {
        $query = Store::query();

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhereHas('category', function ($categoryQuery) use ($search) {
                        $categoryQuery->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('category')) {
            $query->whereHas('category', function ($q) use ($request) {
                $q->where('name', $request->string('category'));
            });
        }

        if ($request->filled('location')) {
            $locationFilter = $request->string('location');
            $query->where('location', 'like', '%' . $locationFilter . '%');
        }

        $hasCoordinatesFilter = $request->filled(['lat', 'lng']);
        if ($hasCoordinatesFilter) {
            $latitude = (float) $request->input('lat');
            $longitude = (float) $request->input('lng');
            $radius = (float) $request->input('radius_km', 50);
            $radius = max(1, min(200, $radius));

            $haversine = "(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))";

            $query->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->selectRaw("{$haversine} as distance_km", [$latitude, $longitude, $latitude])
                ->having('distance_km', '<=', $radius);
        } else {
            $query->select('*');
        }

        if ($request->boolean('only_verified')) {
            $query->where('is_verified', true);
        }

        if ($request->boolean('only_boosted')) {
            $query->where('is_boosted', true);
        }

        $limit = (int) $request->integer('limit', 50);
        $limit = max(1, min(100, $limit));

        // For admin panel, show all stores (active + banned)
        // For public API, show only active stores
        $user = $request->user();
        $isAdmin = $user?->role === 'super_admin';
        
        \Log::info('getAllStores called', [
            'user_id' => $user?->id,
            'user_role' => $user?->role,
            'is_admin' => $isAdmin,
            'limit' => $request->input('limit', 50)
        ]);
        
        // For admin panel, show all stores (active + banned)
        // For public API, show only active stores
        if (!$isAdmin) {
            $query->where('is_active', true);
            \Log::info('Filtering active stores only (non-admin user)');
        } else {
            \Log::info('Showing all stores (admin user)');
        }
        
        $stores = $query->with([
                'products' => function($q) {
                    $q->where('is_active', true)
                      ->orderBy('created_at', 'desc')
                      ->limit(3);
                },
                'services' => function($q) {
                    $q->where('is_active', true)
                      ->orderBy('created_at', 'desc')
                      ->limit(3);
                },
                'category' => $this->categoryRelationWithBanners(),
                'activeBoost.plan',
                'activeSubscription.plan',
                'user:id,name,email',
            ])
            ->withCount(['products', 'services'])
            ->when($hasCoordinatesFilter, function ($q) {
                $q->orderBy('distance_km')
                    ->orderByDesc('is_boosted')
                    ->orderByDesc('boost_expiry_date');
            }, function ($q) {
                $q->orderByDesc('is_boosted')
                    ->orderByDesc('boost_expiry_date')
                    ->latest();
            })
            ->take($limit)
            ->get();

        $stores = $this->applyCategoryBannerData($stores);

        return $this->successResponse('Stores retrieved successfully.', $stores);
    }

    public function myStores(Request $request)
    {
        $user = $request->user();
        \Log::info('myStores called', ['user_id' => $user->id, 'user_email' => $user->email, 'role' => $user->role]);
        
        // For super admin, show all stores
        // For regular users, show only their stores
        if ($user->role === 'super_admin') {
            \Log::info('Executing admin branch - showing all stores');
            $stores = \App\Models\Store::with([
                'category' => $this->categoryRelationWithBanners(),
                'activeSubscription.plan',
                'activeBoost.plan',
                'user'
            ])
            ->withCount(['products', 'services'])
            ->orderByDesc('created_at')
            ->get();
        } else {
            \Log::info('Executing user branch - showing only user stores');
            $stores = $user
                ->stores()
                ->with([
                    'category' => $this->categoryRelationWithBanners(),
                    'activeSubscription.plan',
                    'activeBoost.plan'
                ])
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
        \Log::debug('Create store request', ['user_id' => $user->id, 'payload' => $request->all()]);

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
        $data['user_id'] = $user->id;

        if ((! isset($data['latitude']) || $data['latitude'] === null) && (! isset($data['longitude']) || $data['longitude'] === null)) {
            $coordinates = $this->geocodeLocation($data['location'] ?? $data['address'] ?? null);
            if ($coordinates) {
                [$data['latitude'], $data['longitude']] = $coordinates;
            }
        }

        $store = Store::create($data);
        $store->load(['category' => $this->categoryRelationWithBanners()]);
        $store = $this->applyCategoryBannerData($store);

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

            // Load relationships separately to avoid issues
            try {
                $store->load([
                    'category' => $this->categoryRelationWithBanners(),
                    'activeBoost.plan',
                    'activeSubscription.plan',
                    'products' => function ($query) {
                        $query->orderByDesc('created_at');
                    },
                ]);
                \Log::info('Relationships loaded successfully');
            } catch (\Exception $e) {
                \Log::error('Failed to load relationships: ' . $e->getMessage());
                // Continue without relationships
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

    private function categoryRelationWithBanners(): Closure
    {
        return function ($query) {
            $query->select([
                'id',
                'name',
                'slug',
                'business_type',
                'banner_image',
                'banner_images',
                'banner_title',
                'banner_subtitle',
                'banner_color',
                'color_combinations',
                'banner_pattern',
            ])->with(['bannerTemplates' => function ($bannerTemplates) {
                $bannerTemplates->select([
                    'id',
                    'category_id',
                    'device',
                    'bg_image',
                    'title',
                    'subtitle',
                ])->orderBy('id');
            }]);
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
                $bannerImages = collect($category->banner_images)
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
