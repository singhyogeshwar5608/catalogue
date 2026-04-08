cd public_html/backend

echo "=== DEBUG BAN UPDATE ==="

echo "1. Check current store status in database..."
php artisan tinker --execute="
\$store = \App\Models\Store::first();
if (\$store) {
    echo 'Store ID: ' . \$store->id . PHP_EOL;
    echo 'Store Name: ' . \$store->name . PHP_EOL;
    echo 'is_active: ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
    echo 'is_active field type: ' . gettype(\$store->is_active) . PHP_EOL;
}
"

echo -e "\n2. Test manual update..."
php artisan tinker --execute="
\$store = \App\Models\Store::first();
if (\$store) {
    \$oldStatus = \$store->is_active;
    \$store->update(['is_active' => !\$store->is_active]);
    \$store->refresh();
    echo 'Updated is_active from ' . (\$oldStatus ? 'TRUE' : 'FALSE') . ' to ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
    
    // Revert back
    \$store->update(['is_active' => \$oldStatus]);
    echo 'Reverted back to: ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
