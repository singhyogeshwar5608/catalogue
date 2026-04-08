cd public_html/backend

echo "=== CHECK STORE EXISTS ==="

php artisan tinker --execute="
\$store = \App\Models\Store::where('slug', 'aniket-stoe')->first();
if (\$store) {
    echo 'Store found: ' . \$store->name . ' (ID: ' . \$store->id . ')' . PHP_EOL;
    echo 'Banner: ' . (\$store->banner ?? 'NULL') . PHP_EOL;
} else {
    echo 'Store NOT found with slug: aniket-stoe' . PHP_EOL;
    
    // Show all available stores
    \$stores = \App\Models\Store::select('slug', 'name')->take(5)->get();
    echo 'Available stores:' . PHP_EOL;
    foreach (\$stores as \$s) {
        echo '  - ' . \$s->slug . ' (' . \$s->name . ')' . PHP_EOL;
    }
}
"
