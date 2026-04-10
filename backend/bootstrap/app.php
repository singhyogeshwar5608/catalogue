<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Same file registered twice: some stacks resolve the path as `api/v1/v1/...`, others as `v1/v1/...`
            // (reverse proxies, PHP built-in server, etc.). Both must match so the API works everywhere.
            $apiRoutes = base_path('routes/api.php');
            Route::middleware('api')->prefix('api/v1/v1')->group($apiRoutes);
            Route::middleware('api')->prefix('v1/v1')->group($apiRoutes);
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // 500/HTML error responses skip the normal CORS middleware; browsers then report a CORS failure.
        $exceptions->respond(function (Response $response, \Throwable $e, Request $request) {
            $path = $request->path();
            if (! str_starts_with($path, 'api/') && ! str_starts_with($path, 'v1/')) {
                return $response;
            }
            $origin = $request->headers->get('Origin');
            if (! $origin) {
                return $response;
            }
            if (in_array($origin, config('cors.allowed_origins', []), true)) {
                $response->headers->set('Access-Control-Allow-Origin', $origin);
                if (config('cors.supports_credentials')) {
                    $response->headers->set('Access-Control-Allow-Credentials', 'true');
                }
                return $response;
            }
            foreach (config('cors.allowed_origins_patterns', []) as $pattern) {
                if (is_string($pattern) && @preg_match($pattern, $origin)) {
                    $response->headers->set('Access-Control-Allow-Origin', $origin);
                    if (config('cors.supports_credentials')) {
                        $response->headers->set('Access-Control-Allow-Credentials', 'true');
                    }
                    return $response;
                }
            }

            return $response;
        });
    })->create();
