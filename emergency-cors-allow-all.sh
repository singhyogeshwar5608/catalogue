cd public_html/backend

echo "=== EMERGENCY CORS FIX ==="

cat > config/cors.php << 'EOF'
<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
EOF

echo "CORS set to allow all origins"

php artisan config:clear
php artisan cache:clear

echo "Testing CORS..."
curl -I https://kaushalschoolfurniture.com/api/v1/v1/auth/login -H "Origin: http://localhost:3001"
