cd public_html/backend

echo "=== TEST MYSTORES FIX ==="

echo "1. Check admin user role..."
php artisan tinker --execute="
\$user = \App\Models\User::find(118);
if (\$user) {
    echo 'User ID: ' . \$user->id . PHP_EOL;
    echo 'User Email: ' . \$user->email . PHP_EOL;
    echo 'User Role: ' . \$user->role . PHP_EOL;
} else {
    echo 'User not found' . PHP_EOL;
}
"

echo -e "\n2. Test Store query for admin..."
php artisan tinker --execute="
\$stores = \App\Models\Store::with(['user'])->get();
echo 'All stores count: ' . \$stores->count() . PHP_EOL;
foreach (\$stores as \$store) {
    echo '- ' . \$store->name . ' (Owner: ' . \$store->user->email . ')' . PHP_EOL;
}
"

echo -e "\n3. Clear caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear

echo -e "\n=== DONE ==="
