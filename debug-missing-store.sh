cd public_html/backend

echo "=== DEBUG MISSING STORE ==="

echo "1. Check all stores with details..."
php artisan tinker --execute="
\$stores = \App\Models\Store::with('user')->get();
echo 'All stores:' . PHP_EOL;
foreach (\$stores as \$store) {
    echo '- ID: ' . \$store->id . ', Name: ' . \$store->name . ', User: ' . \$store->user->email . ', Active: ' . (\$store->is_active ? 'YES' : 'NO') . PHP_EOL;
}
"

echo -e "\n2. Check Store 121 specifically..."
php artisan tinker --execute="
\$store = \App\Models\Store::find(121);
if (\$store) {
    echo 'Store 121 details:' . PHP_EOL;
    echo '- Name: ' . \$store->name . PHP_EOL;
    echo '- User ID: ' . \$store->user_id . PHP_EOL;
    echo '- is_active: ' . (\$store->is_active ? 'TRUE' : 'FALSE') . PHP_EOL;
    echo '- Category ID: ' . \$store->category_id . PHP_EOL;
    echo '- Created at: ' . \$store->created_at . PHP_EOL;
    
    \$user = \$store->user;
    if (\$user) {
        echo '- User email: ' . \$user->email . PHP_EOL;
        echo '- User role: ' . \$user->role . PHP_EOL;
    }
} else {
    echo 'Store 121 not found' . PHP_EOL;
}
"

echo -e "\n3. Test the Store query directly..."
php artisan tinker --execute="
\$stores = \App\Models\Store::with(['user', 'category'])->get();
echo 'Store count: ' . \$stores->count() . PHP_EOL;
foreach (\$stores as \$store) {
    echo '- Store: ' . \$store->name . ' (ID: ' . \$store->id . ')' . PHP_EOL;
    if (!\$store->user) {
        echo '  -> MISSING USER RELATIONSHIP' . PHP_EOL;
    }
    if (!\$store->category) {
        echo '  -> MISSING CATEGORY RELATIONSHIP' . PHP_EOL;
    }
}
"

echo -e "\n=== DONE ==="
