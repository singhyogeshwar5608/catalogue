cd public_html/backend

echo "=== CHECKING STORES IN DATABASE ==="

echo "1. Check database connection..."
php artisan tinker --execute="
echo 'Database: ' . config('database.default') . PHP_EOL;
echo 'Database Name: ' . config('database.connections.' . config('database.default') . '.database') . PHP_EOL;
"

echo -e "\n2. Count stores in database..."
php artisan tinker --execute="
\$count = \App\Models\Store::count();
echo 'Total stores: ' . \$count . PHP_EOL;
"

echo -e "\n3. Show first 5 stores..."
php artisan tinker --execute="
\$stores = \App\Models\Store::take(5)->get(['id', 'name', 'email', 'created_at']);
foreach (\$stores as \$store) {
    echo \$store->id . ' - ' . \$store->name . ' - ' . \$store->email . PHP_EOL;
}
if (\$stores->count() === 0) {
    echo 'No stores found in database!' . PHP_EOL;
}
"

echo -e "\n4. Test API response..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5" | head -c 500

echo -e "\n=== DONE ==="
