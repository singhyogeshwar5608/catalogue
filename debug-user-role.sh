cd public_html/backend

echo "=== DEBUG USER ROLE ==="

echo "1. Check admin user role..."
php artisan tinker --execute="
\$user = \App\Models\User::find(118);
if (\$user) {
    echo 'User ID: ' . \$user->id . PHP_EOL;
    echo 'User Email: ' . \$user->email . PHP_EOL;
    echo 'User Role: ' . \$user->role . PHP_EOL;
    echo 'Is Super Admin: ' . (\$user->role === 'super_admin' ? 'YES' : 'NO') . PHP_EOL;
    echo 'Role Comparison: ' . PHP_EOL;
    echo '  - \$user->role: \"' . \$user->role . '\"' . PHP_EOL;
    echo '  - \"super_admin\": \"' . 'super_admin' . '\"' . PHP_EOL;
    echo '  - Strict comparison: ' . (\$user->role === 'super_admin' ? 'TRUE' : 'FALSE') . PHP_EOL;
    echo '  - Loose comparison: ' . (\$user->role == 'super_admin' ? 'TRUE' : 'FALSE') . PHP_EOL;
} else {
    echo 'User not found' . PHP_EOL;
}
"

echo -e "\n2. Check all users with admin roles..."
php artisan tinker --execute="
\$users = \App\Models\User::where('role', 'like', '%admin%')->get();
echo 'Users with admin roles:' . PHP_EOL;
foreach (\$users as \$user) {
    echo '- ID: ' . \$user->id . ', Email: ' . \$user->email . ', Role: \"' . \$user->role . '\"' . PHP_EOL;
}
"

echo -e "\n=== DONE ==="
