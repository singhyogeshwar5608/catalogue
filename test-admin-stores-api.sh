cd public_html/backend

echo "=== TEST ADMIN STORES API ==="

echo "1. Test /stores endpoint (used by admin panel)..."
echo "curl -H \"Authorization: Bearer YOUR_TOKEN\" https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=100"

echo -e "\n2. Check if admin user role is correct..."
php artisan tinker --execute="
\$user = \App\Models\User::find(118);
if (\$user) {
    echo 'User ID: ' . \$user->id . PHP_EOL;
    echo 'User Email: ' . \$user->email . PHP_EOL;
    echo 'User Role: ' . \$user->role . PHP_EOL;
    echo 'Is Super Admin: ' . (\$user->role === 'super_admin' ? 'YES' : 'NO') . PHP_EOL;
} else {
    echo 'User not found' . PHP_EOL;
}
"

echo -e "\n3. Check all stores current status..."
php artisan tinker --execute="
\$stores = \App\Models\Store::with('user')->get();
echo 'All stores with status:' . PHP_EOL;
foreach (\$stores as \$store) {
    \$status = \$store->is_active ? 'ACTIVE' : 'BANNED';
    echo '- ID: ' . \$store->id . ', Name: ' . \$store->name . ', Status: ' . \$status . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
