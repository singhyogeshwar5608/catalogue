cd public_html/backend

echo "=== CHECK RAVI STORE STATUS ==="

echo "1. Check Ravi Store (ID 121)..."
php artisan tinker --execute="
\$store = \App\Models\Store::find(121);
if (\$store) {
    echo 'Store Name: ' . \$store->name . PHP_EOL;
    echo 'Store ID: ' . \$store->id . PHP_EOL;
    echo 'User ID: ' . \$store->user_id . PHP_EOL;
    echo 'is_active: ' . (\$store->is_active ? 'TRUE (Active)' : 'FALSE (Banned)') . PHP_EOL;
    echo 'Created at: ' . \$store->created_at . PHP_EOL;
    echo 'Updated at: ' . \$store->updated_at . PHP_EOL;
    
    \$user = \$store->user;
    if (\$user) {
        echo 'Owner: ' . \$user->email . PHP_EOL;
    }
} else {
    echo 'Store 121 not found' . PHP_EOL;
}
"

echo -e "\n2. Check all stores with active status..."
php artisan tinker --execute="
\$stores = \App\Models\Store::with('user')->get();
echo 'All stores with status:' . PHP_EOL;
foreach (\$stores as \$store) {
    \$status = \$store->is_active ? 'ACTIVE' : 'BANNED';
    echo '- ID: ' . \$store->id . ', Name: ' . \$store->name . ', Status: ' . \$status . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
