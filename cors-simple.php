<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:*',
        'https://kaushalschoolfurniture.com',
        'http://kaushalschoolfurniture.com',
        'https://www.kaushalschoolfurniture.com',
        'http://www.kaushalschoolfurniture.com',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
