cd public_html/backend

echo "=== LOGIN DEBUG ==="

echo "1. Check JWT_SECRET..."
php artisan tinker --execute="
echo 'JWT_SECRET: ' . config('jwt.secret') . PHP_EOL;
echo 'JWT_SECRET exists: ' . (config('jwt.secret') ? 'YES' : 'NO') . PHP_EOL;
"

echo -e "\n2. Check admin user exists..."
php artisan tinker --execute="
\$user = \App\Models\User::where('email', 'admin@catelog.com')->first();
if (\$user) {
    echo 'Admin user found: ' . \$user->email . PHP_EOL;
    echo 'User ID: ' . \$user->id . PHP_EOL;
} else {
    echo 'Admin user NOT found!' . PHP_EOL;
}
"

echo -e "\n3. Test login API directly..."
curl -X POST "https://kaushalschoolfurniture.com/api/v1/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@catelog.com","password":"admin123"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n=== DONE ==="
