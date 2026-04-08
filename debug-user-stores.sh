cd public_html/backend

echo "=== DEBUG USER STORES ==="

echo "1. Check current user..."
php artisan tinker --execute="
\$user = \App\Models\User::find(118);
if (\$user) {
    echo 'User ID: ' . \$user->id . PHP_EOL;
    echo 'User Email: ' . \$user->email . PHP_EOL;
    echo 'User Role: ' . \$user->role . PHP_EOL;
    
    echo 'Store count: ' . \$user->stores()->count() . PHP_EOL;
    
    \$stores = \$user->stores()->get();
    echo 'User stores:' . PHP_EOL;
    foreach (\$stores as \$store) {
        echo '- ID: ' . \$store->id . ', Name: ' . \$store->name . ', Slug: ' . \$store->slug . ', Active: ' . (\$store->is_active ? 'YES' : 'NO') . PHP_EOL;
    }
} else {
    echo 'User not found' . PHP_EOL;
}
"

echo -e "\n2. Check all stores and their users..."
php artisan tinker --execute="
\$stores = \App\Models\Store::with('user')->get();
echo 'All stores with users:' . PHP_EOL;
foreach (\$stores as \$store) {
    echo '- Store ID: ' . \$store->id . ', Name: ' . \$store->name . ', User ID: ' . \$store->user_id . ', User: ' . (\$store->user ? \$store->user->email : 'NULL') . PHP_EOL;
}
"

echo -e "\n3. Check stores for user ID 118..."
php artisan tinker --execute="
\$stores = \App\Models\Store::where('user_id', 118)->get();
echo 'Stores for user 118:' . PHP_EOL;
foreach (\$stores as \$store) {
    echo '- ID: ' . \$store->id . ', Name: ' . \$store->name . ', Active: ' . (\$store->is_active ? 'YES' : 'NO') . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
