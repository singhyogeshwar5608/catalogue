cd public_html/backend

echo "=== TEST BAN FUNCTION ==="

echo "1. Test manual ban update..."
php artisan tinker --execute="
\$store = \App\Models\Store::first();
if (\$store) {
    echo 'Before: is_active = ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
    
    // Test ban (set to false)
    \$store->update(['is_active' => false]);
    \$store->refresh();
    echo 'After ban: is_active = ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
    
    // Test unban (set to true)
    \$store->update(['is_active' => true]);
    \$store->refresh();
    echo 'After unban: is_active = ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
}
"

echo -e "\n2. Test API endpoint directly..."
php artisan tinker --execute="
\$store = \App\Models\Store::first();
if (\$store) {
    echo 'Store ID: ' . \$store->id . PHP_EOL;
    echo 'Current is_active: ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
    
    // Simulate API call
    try {
        \$store->update(['is_active' => false]);
        echo 'API simulation: Banned successfully' . PHP_EOL;
        
        \$store->refresh();
        echo 'New is_active: ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
        
        // Restore
        \$store->update(['is_active' => true]);
        echo 'Restored to active' . PHP_EOL;
    } catch (Exception \$e) {
        echo 'Error: ' . \$e->getMessage() . PHP_EOL;
    }
}
"

echo -e "\n=== DONE ==="
