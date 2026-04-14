cd public_html/backend

echo "=== CHECKING SAMPLE STORES ==="

echo "1. Check if any stores exist..."
php artisan tinker --execute="
\$stores = \App\Models\Store::count();
echo 'Total stores: ' . \$stores . PHP_EOL;
"

echo -e "\n2. Check if there are sample stores in development..."
php artisan tinker --execute="
\$stores = \App\Models\Store::take(5)->get(['id', 'name', 'email', 'is_active']);
foreach (\$stores as \$store) {
    echo \$store->id . ' - ' . \$store->name . ' (' . (\$store->is_active ? 'Active' : 'Inactive') . ')' . PHP_EOL;
}
if (\$stores->count() === 0) {
    echo 'No stores found!' . PHP_EOL;
}
"

echo -e "\n3. Check if this is development environment..."
echo "APP_ENV: $(grep APP_ENV .env | cut -d'=' -f2)"

echo -e "\n4. Test what API actually returns..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=3" | head -c 800

echo -e "\n=== DONE ==="
