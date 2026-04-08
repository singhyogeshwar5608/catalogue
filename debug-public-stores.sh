cd public_html/backend

echo "=== CHECKING PUBLIC STORES API ==="

echo "1. Test public stores endpoint..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5" | head -c 1000

echo -e "\n\n2. Test with location..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5&lat=28.6139&lng=77.2090" | head -c 1000

echo -e "\n\n3. Check if there are sample stores in seeder..."
php artisan tinker --execute="
\$stores = \App\Models\Store::take(3)->get(['id', 'name', 'email']);
foreach (\$stores as \$store) {
    echo \$store->id . ' - ' . \$store->name . PHP_EOL;
}
if (\$stores->count() === 0) {
    echo 'No stores in database!' . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
