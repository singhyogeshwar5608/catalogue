cd public_html/backend

echo "=== FIX USER STORESLUG ==="

echo "1. Find user with wrong storeSlug..."
php artisan tinker --execute="
\$user = \App\Models\User::where('email', 'aniket@gmail.com')->first();
if (\$user) {
    echo 'User found: ' . \$user->email . PHP_EOL;
    echo 'Current storeSlug: ' . (\$user->storeSlug ?? 'NULL') . PHP_EOL;
    
    \$store = \$user->stores()->first();
    if (\$store) {
        echo 'Actual store slug: ' . \$store->slug . PHP_EOL;
        echo 'Store name: ' . \$store->name . PHP_EOL;
        
        // Update user's storeSlug to correct value
        \$user->update(['storeSlug' => \$store->slug]);
        echo 'Updated user storeSlug to: ' . \$store->slug . PHP_EOL;
    } else {
        echo 'User has no stores' . PHP_EOL;
    }
} else {
    echo 'User not found' . PHP_EOL;
}
"

echo -e "\n2. Verify the fix..."
php artisan tinker --execute="
\$user = \App\Models\User::where('email', 'aniket@gmail.com')->first();
if (\$user) {
    echo 'Updated storeSlug: ' . (\$user->storeSlug ?? 'NULL') . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
