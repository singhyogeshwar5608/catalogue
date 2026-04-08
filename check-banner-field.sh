cd public_html/backend

echo "=== CHECK BANNER FIELD ==="

php artisan tinker --execute="
\$store = \App\Models\Store::where('slug', 'aniket-stoe')->first();
if (\$store) {
    echo 'Store found: ' . \$store->name . PHP_EOL;
    echo 'Banner field: ' . (\$store->banner ?? 'NULL') . PHP_EOL;
    echo 'Banner length: ' . strlen(\$store->banner ?? '') . PHP_EOL;
    echo 'Banner starts with: ' . substr(\$store->banner ?? '', 0, 50) . '...' . PHP_EOL;
} else {
    echo 'Store not found' . PHP_EOL;
}
"
