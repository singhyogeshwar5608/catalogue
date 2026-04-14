cd public_html/backend

echo "=== DEBUG STORES ERROR ==="

echo "1. Check Laravel logs for stores API error..."
tail -50 storage/logs/laravel.log | grep -A 10 -B 5 "listStores\|stores" | tail -20

echo -e "\n2. Check if there are any syntax errors in StoreController..."
php artisan route:list | grep stores | head -5

echo -e "\n3. Test the StoreController directly..."
php artisan tinker --execute="
try {
    \$controller = new \App\Http\Controllers\Api\StoreController();
    \$request = new \Illuminate\Http\Request(['limit' => 5]);
    \$response = \$controller->listStores(\$request);
    echo 'Controller works: ' . get_class(\$response) . PHP_EOL;
} catch (\Exception \$e) {
    echo 'Controller error: ' . \$e->getMessage() . PHP_EOL;
    echo 'Line: ' . \$e->getLine() . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
