cd public_html/backend

echo "=== DEBUG STORE SLUG 404 ==="

echo "1. Check if store 'svvcsadv' exists..."
php artisan tinker --execute="
\$store = \App\Models\Store::where('slug', 'svvcsadv')->first();
if (\$store) {
    echo 'Store found: ' . \$store->name . ' (ID: ' . \$store->id . ')' . PHP_EOL;
    echo 'Username: ' . \$store->username . PHP_EOL;
    echo 'Slug: ' . \$store->slug . PHP_EOL;
    echo 'Is active: ' . (\$store->is_active ? 'YES' : 'NO') . PHP_EOL;
} else {
    echo 'Store NOT found with slug: svvcsadv' . PHP_EOL;
}
"

echo -e "\n2. Check all available stores..."
php artisan tinker --execute="
\$stores = \App\Models\Store::select('slug', 'name', 'username', 'is_active')->get();
echo 'All stores in database:' . PHP_EOL;
foreach (\$stores as \$store) {
    echo '- ' . \$store->slug . ' (' . \$store->name . ') - Active: ' . (\$store->is_active ? 'YES' : 'NO') . PHP_EOL;
}
"

echo -e "\n3. Check if user is trying to access correct store..."
php artisan tinker --execute="
\$user = \App\Models\User::where('email', 'like', '%svvcsadv%')->first();
if (\$user) {
    echo 'User found: ' . \$user->email . PHP_EOL;
    \$userStores = \$user->stores()->select('slug', 'name')->get();
    foreach (\$userStores as \$store) {
        echo 'User store: ' . \$store->slug . ' (' . \$store->name . ')' . PHP_EOL;
    }
} else {
    echo 'No user found with svvcsadv in email' . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
