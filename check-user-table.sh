cd public_html/backend

echo "=== CHECK USER TABLE STRUCTURE ==="

echo "1. Check users table columns..."
php artisan tinker --execute="
\$columns = \Illuminate\Support\Facades\Schema::getColumnListing('users');
echo 'Users table columns:' . PHP_EOL;
foreach (\$columns as \$column) {
    echo '- ' . \$column . PHP_EOL;
}
"

echo -e "\n2. Check user data after update..."
php artisan tinker --execute="
\$user = \App\Models\User::where('email', 'aniket@gmail.com')->first();
if (\$user) {
    echo 'User ID: ' . \$user->id . PHP_EOL;
    echo 'User email: ' . \$user->email . PHP_EOL;
    echo 'Store slug field: ' . (\$user->store_slug ?? 'NULL') . PHP_EOL;
    echo 'Store slug (snake_case): ' . (\$user->store_slug ?? 'NULL') . PHP_EOL;
    
    // Check all user attributes
    \$attributes = \$user->getAttributes();
    echo 'All user attributes:' . PHP_EOL;
    foreach (\$attributes as \$key => \$value) {
        if (strpos(\$key, 'store') !== false || strpos(\$key, 'slug') !== false) {
            echo '- ' . \$key . ': ' . (\$value ?? 'NULL') . PHP_EOL;
        }
    }
}
"

echo -e "\n=== DONE ==="
