<?php

use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminPlatformSettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoostPlanController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\StoreBoostController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\StorePaymentIntegrationController;
use App\Http\Controllers\Api\StoreSubscriptionController;
use App\Http\Controllers\Api\StoreSubscriptionRazorpayController;
use App\Http\Controllers\Api\SubscriptionPlanController;
use App\Http\Controllers\Api\UtilityController;
use Illuminate\Support\Facades\Route;

// URL prefix is `api/v1/v1` (set in bootstrap/app.php).

/** Explicit OPTIONS so some proxies/CDNs that skip CORS middleware still return 204 for preflight. */
Route::options('auth/login', static fn () => response('', 204));
Route::options('auth/register', static fn () => response('', 204));

Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);
Route::get('auth/google', [AuthController::class, 'googleRedirect']);
Route::get('auth/google/callback', [AuthController::class, 'googleCallback']);

Route::get('utils/geo', [UtilityController::class, 'geoLookup']);
Route::get('utils/free-trial-days', [UtilityController::class, 'freeTrialDays']);
Route::get('categories', [CategoryController::class, 'index']);
Route::get('category/{slug}', [CategoryController::class, 'show']);
Route::get('stores', [StoreController::class, 'listStores']);
Route::get('search', [SearchController::class, 'search']);

Route::get('product/{id}/reviews', [ReviewController::class, 'listProductReviews']);
Route::get('store/{storeId}/reviews', [ReviewController::class, 'listStoreReviews']);

Route::middleware('auth:api')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::prefix('boost-plans')->group(function () {
        Route::get('/', [BoostPlanController::class, 'publicIndex']);

        Route::middleware('role:super_admin')->group(function () {
            Route::get('/all', [BoostPlanController::class, 'index']);
            Route::post('/', [BoostPlanController::class, 'store']);
            Route::put('/{plan}', [BoostPlanController::class, 'update']);
            Route::delete('/{plan}', [BoostPlanController::class, 'destroy']);
        });
    });

    Route::get('admin/dashboard', AdminDashboardController::class)
        ->middleware('role:super_admin');

    Route::middleware('role:super_admin')->group(function () {
        Route::get('admin/settings/free-trial', [AdminPlatformSettingController::class, 'showFreeTrial']);
        Route::put('admin/settings/free-trial', [AdminPlatformSettingController::class, 'updateFreeTrial']);
        Route::get('admin/settings/subscription-addons', [AdminPlatformSettingController::class, 'showSubscriptionAddons']);
        Route::put('admin/settings/subscription-addons', [AdminPlatformSettingController::class, 'updateSubscriptionAddons']);
    });

    Route::prefix('subscription-plans')->group(function () {
        Route::get('/', [SubscriptionPlanController::class, 'publicIndex']);
        Route::get('addon-prices', [SubscriptionPlanController::class, 'publicAddonPrices']);

        Route::middleware('role:super_admin')->group(function () {
            Route::get('/all', [SubscriptionPlanController::class, 'index']);
            Route::post('/', [SubscriptionPlanController::class, 'store']);
            Route::put('/{plan}', [SubscriptionPlanController::class, 'update']);
            Route::delete('/{plan}', [SubscriptionPlanController::class, 'destroy']);
        });
    });

    Route::prefix('stores/{store}/subscription')->group(function () {
        Route::get('/', [StoreSubscriptionController::class, 'show']);
        Route::post('/', [StoreSubscriptionController::class, 'activate']);
        Route::post('addons', [StoreSubscriptionController::class, 'saveAddonSelection']);
        Route::post('razorpay-order', [StoreSubscriptionRazorpayController::class, 'createOrder']);
        Route::post('razorpay-verify', [StoreSubscriptionRazorpayController::class, 'verifyPayment']);
    });

    Route::get('stores/{store}/payment-integration', [StorePaymentIntegrationController::class, 'show']);
    Route::post('stores/{store}/payment-integration', [StorePaymentIntegrationController::class, 'update']);

    Route::get('subscriptions', [StoreSubscriptionController::class, 'index'])
        ->middleware('role:super_admin');
    Route::delete('subscriptions/{subscription}', [StoreSubscriptionController::class, 'cancel'])
        ->middleware('role:super_admin');

    Route::prefix('stores/{store}/boosts')->group(function () {
        Route::get('/', [StoreBoostController::class, 'show']);
        Route::post('/', [StoreBoostController::class, 'activate']);
    });

    Route::get('boosts', [StoreBoostController::class, 'index'])->middleware('role:super_admin');
    Route::delete('boosts/{boost}', [StoreBoostController::class, 'cancel'])->middleware('role:super_admin');

    Route::post('store', [StoreController::class, 'createStore']);
    Route::get('my/stores', [StoreController::class, 'myStores']);
    Route::put('store/{id}', [StoreController::class, 'updateStore']);
    Route::delete('store/{id}', [StoreController::class, 'deleteStore']);

    Route::post('product', [ProductController::class, 'addProduct']);
    Route::put('product/{id}', [ProductController::class, 'updateProduct']);
    Route::delete('product/{id}', [ProductController::class, 'deleteProduct']);

    Route::post('service', [ServiceController::class, 'store']);
    Route::post('services', [ServiceController::class, 'store']);
    Route::put('service/{id}', [ServiceController::class, 'updateService']);
    Route::delete('service/{id}', [ServiceController::class, 'deleteService']);

    Route::middleware(['role:super_admin'])->group(function () {
        Route::post('categories', [CategoryController::class, 'store']);
        Route::delete('categories/{id}', [CategoryController::class, 'destroy']);
        Route::put('categories/{id}/banner', [CategoryController::class, 'updateBanner']);
        Route::put('admin/category/{id}/banner', [CategoryController::class, 'updateBanner']);
    });

    Route::post('product/{id}/reviews', [ReviewController::class, 'submitProductReview']);
    Route::post('store/{storeId}/reviews', [ReviewController::class, 'submitStoreReview']);
});

Route::get('store/{slug}', [StoreController::class, 'getStoreBySlug']);
Route::get('products/{storeId}', [ProductController::class, 'getProductsByStore']);
Route::get('product/{id}', [ProductController::class, 'getProductById']);
Route::get('services/{storeId}', [ServiceController::class, 'getServicesByStore']);
Route::get('service/{id}', [ServiceController::class, 'getServiceById']);
