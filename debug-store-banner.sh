cd public_html/backend

echo "=== DEBUG STORE BANNER ==="

php artisan tinker --execute="
\$store = \App\Models\Store::where('slug', 'aniket-stoe')->first();
if (\$store) {
    echo 'Store ID: ' . \$store->id . PHP_EOL;
    echo 'Store Name: ' . \$store->name . PHP_EOL;
    echo 'Banner field: ' . (\$store->banner ?? 'NULL') . PHP_EOL;
    echo 'Banner length: ' . strlen(\$store->banner ?? '') . PHP_EOL;
    echo 'Banner is empty: ' . (empty(\$store->banner) ? 'YES' : 'NO') . PHP_EOL;
    
    // Check if banner is a valid URL
    if (\$store->banner) {
        echo 'Banner starts with http: ' . (strpos(\$store->banner, 'http') === 0 ? 'YES' : 'NO') . PHP_EOL;
        echo 'Banner preview: ' . substr(\$store->banner, 0, 100) . '...' . PHP_EOL;
    }
} else {
    echo 'Store not found' . PHP_EOL;
}
"

echo -e "\n=== CHECK API RESPONSE ==="

curl -s "https://kaushalschoolfurniture.com/api/v1/v1/store/aniket-stoe" | grep -o '"banner":"[^"]*"' | head -3
