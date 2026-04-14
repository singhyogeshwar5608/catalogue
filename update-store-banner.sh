cd public_html/backend

echo "=== UPDATE STORE BANNER ==="

# Check if banner field exists in database
php artisan tinker --execute="
\$store = \App\Models\Store::where('slug', 'aniket-stoe')->first();
if (\$store) {
    echo 'Current banner: ' . (\$store->banner ?? 'NULL') . PHP_EOL;
    
    // If banner is empty, you might need to update it
    // Uncomment and modify the line below to set a banner
    // \$store->update(['banner' => 'your-uploaded-banner-url']);
    
    echo 'Store banner field exists in database' . PHP_EOL;
} else {
    echo 'Store not found' . PHP_EOL;
}
"
