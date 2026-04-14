cd public_html/backend

echo "=== DEBUGGING STORES API RESPONSE ==="

echo "1. Test stores API directly..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5" | jq '.' 2>/dev/null || curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5"

echo -e "\n\n2. Check response headers..."
curl -I "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5"

echo -e "\n\n3. Verify database has 0 stores..."
php artisan tinker --execute="
\$count = \App\Models\Store::count();
echo 'Actual stores in database: ' . \$count . PHP_EOL;
"

echo -e "\n4. Check if API returns hardcoded data..."
php artisan tinker --execute="
\$response = app('App\Http\Controllers\Api\StoreController')->listStores(request());
echo 'API Response Type: ' . gettype(\$response) . PHP_EOL;
echo 'Response Data: ' . json_encode(\$response->getData()) . PHP_EOL;
"

echo -e "\n=== DONE ==="
