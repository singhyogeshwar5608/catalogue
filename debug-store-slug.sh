cd public_html/backend

echo "=== DEBUG STORE SLUG ERROR ==="

echo "1. Check Laravel logs for this specific error..."
tail -50 storage/logs/laravel.log | grep -A 5 -B 5 "getStoreBySlug\|aniket-stoe"

echo -e "\n2. Test the exact failing URL..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/store/aniket-stoe" -w "\nHTTP Status: %{http_code}\n"

echo -e "\n3. Check if store 'aniket-stoe' exists in database..."
php artisan tinker --execute="
\$store = \App\Models\Store::where('slug', 'aniket-stoe')->first();
if (\$store) {
    echo 'Store found: ' . \$store->name . ' (ID: ' . \$store->id . ')' . PHP_EOL;
} else {
    echo 'Store NOT found with slug: aniket-stoe' . PHP_EOL;
    echo 'Available slugs: ' . \App\Models\Store::pluck('slug')->take(5)->implode(', ') . PHP_EOL;
}
"

echo -e "\n4. Test with a different store slug..."
php artisan tinker --execute="
\$store = \App\Models\Store::first();
if (\$store) {
    echo 'Testing with slug: ' . \$store->slug . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
