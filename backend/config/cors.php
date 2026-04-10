<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    // Include `v1/*` because routes are also registered under prefix `v1/v1` (see bootstrap/app.php).
    'paths' => ['api/*', 'v1/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        // Development origins (when APP_ENV=local)
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        
        // Production origins (when APP_ENV=production)
        'https://kaushalschoolfurniture.com',
        'http://kaushalschoolfurniture.com',
        'https://www.kaushalschoolfurniture.com',
        'http://www.kaushalschoolfurniture.com',
        
        // AWS Amplify production URL
        'https://main.d2euv5dilboqrn.amplifyapp.com',
        
        // Add more production domains as needed
        // 'https://yourdomain.com',
    ],

    // Any localhost / 127.0.0.1 port (Next.js dev, etc.)
    'allowed_origins_patterns' => [
        '/^http:\/\/localhost:\d+$/',
        '/^http:\/\/127\.0\.0\.1:\d+$/',
        // Next dev opened via LAN IP (matches allowedDevOrigins in next.config)
        '/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/',
        '/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
