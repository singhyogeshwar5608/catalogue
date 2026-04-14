cd public_html/backend

echo "=== TEST ADMIN STORES API ==="

echo "1. Test getAllStores API (used by admin stores page)..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5" | head -c 1000

echo -e "\n\n2. Check HTTP status..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5" -w "\nHTTP Status: %{http_code}\n"

echo -e "\n3. Check if stores exist in database..."
php artisan tinker --execute="
\$count = \App\Models\Store::count();
echo 'Total stores in database: ' . \$count . PHP_EOL;

\$stores = \App\Models\Store::take(3)->get(['name', 'slug', 'is_active']);
foreach (\$stores as \$store) {
    echo '- ' . \$store->name . ' (' . \$store->slug . ') - Active: ' . (\$store->is_active ? 'YES' : 'NO') . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
