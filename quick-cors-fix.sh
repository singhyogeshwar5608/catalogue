cd public_html/backend

echo "1. Check current CORS..."
cat config/cors.php | grep -A 10 "allowed_origins"

echo "2. Update CORS config..."
cat > config/cors.php << 'EOF'
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
EOF

echo "3. Clear cache..."
php artisan config:clear
php artisan cache:clear

echo "4. Test CORS..."
curl -I https://kaushalschoolfurniture.com/api/v1/v1/auth/login -H "Origin: http://localhost:3001"
