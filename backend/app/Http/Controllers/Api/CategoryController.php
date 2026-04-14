<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BannerTemplate;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $table = (new Category)->getTable();
        $cols = Schema::getColumnListing($table);
        $has = static fn (string $c): bool => in_array($c, $cols, true);

        $query = Category::query();
        if ($has('name')) {
            $query->orderBy('name');
        }

        if (
            (! $request->user() || $request->user()->role !== 'super_admin')
            && $has('is_active')
        ) {
            $query->where('is_active', true);
        }

        // Only select columns that exist (avoids SQL errors on hosts behind on migrations).
        $categories = $query->get($cols);

        return $this->successResponse('Categories retrieved successfully.', $categories);
    }

    public function show(string $slug)
    {
        $category = Category::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $category) {
            return $this->errorResponse('Category not found.', 404);
        }

        return $this->successResponse('Category retrieved successfully.', $category);
    }

    public function updateBanner(Request $request, int $id)
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->errorResponse('Category not found.', 404);
        }

        $validator = Validator::make($request->all(), [
            'banner_images' => 'nullable|array',
            'banner_images.*' => 'nullable|string|max:150000',
            'banner_title' => 'nullable|string|max:255',
            'banner_subtitle' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();

        $category = DB::transaction(function () use ($category, $data) {
            $updatePayload = $data;
            $hasBannerImagesPayload = array_key_exists('banner_images', $updatePayload);

            if ($hasBannerImagesPayload) {
                $updatePayload['banner_images'] = array_values(
                    array_filter($updatePayload['banner_images'] ?? [], fn ($value) => filled($value))
                );
                $updatePayload['banner_image'] = $updatePayload['banner_images'][0] ?? null;
            }

            $category->update($updatePayload);
            $category->refresh();

            if ($hasBannerImagesPayload) {
                $images = $updatePayload['banner_images'] ?? [];

                BannerTemplate::where('category_id', $category->id)
                    ->where('device', 'desktop')
                    ->delete();

                foreach ($images as $index => $image) {
                    BannerTemplate::create([
                        'category_id' => $category->id,
                        'device' => 'desktop',
                        'name' => sprintf('%s Desktop Banner #%d', $category->name, $index + 1),
                        'bg_image' => $image,
                        'bg_color' => $category->banner_color ?? '#1a1a2e',
                        'title' => $category->banner_title,
                        'subtitle' => $category->banner_subtitle,
                    ]);
                }
            } elseif (array_key_exists('banner_title', $updatePayload) || array_key_exists('banner_subtitle', $updatePayload)) {
                BannerTemplate::where('category_id', $category->id)
                    ->where('device', 'desktop')
                    ->update([
                        'title' => $category->banner_title,
                        'subtitle' => $category->banner_subtitle,
                    ]);
            }

            return $category;
        });

        return $this->successResponse('Category banner updated successfully.', $category);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|alpha_dash|max:255|unique:categories,slug',
            'business_type' => 'required|in:product,service,hybrid',
            'is_active' => 'sometimes|boolean',
            'banner_image' => 'nullable|string|max:150000',
            'banner_images' => 'nullable|array',
            'banner_images.*' => 'nullable|string|max:150000',
            'banner_title' => 'nullable|string|max:255',
            'banner_subtitle' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();
        $data['is_active'] = $data['is_active'] ?? true;

        if (array_key_exists('banner_images', $data)) {
            $data['banner_images'] = array_values(array_filter($data['banner_images'] ?? [], fn ($value) => filled($value)));
            $data['banner_image'] = $data['banner_images'][0] ?? null;
        } elseif (! empty($data['banner_image'])) {
            $data['banner_images'] = [$data['banner_image']];
        }

        $category = Category::create($data);

        return $this->successResponse('Category created successfully.', $category);
    }

    public function destroy(int $id)
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->errorResponse('Category not found.', 404);
        }

        $storesUsingCategory = $category->stores()->count();

        if ($storesUsingCategory > 0) {
            return $this->errorResponse("{$storesUsingCategory} stores are using this category.", 422);
        }

        $category->delete();

        return $this->successResponse('Category deleted successfully.');
    }

}
