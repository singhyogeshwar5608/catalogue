cd public_html/backend

echo "=== REGISTRATION DEBUG ==="

echo "1. Check recent users..."
php artisan tinker --execute="
\$users = \App\Models\User::latest()->take(3)->get(['id', 'name', 'email', 'created_at']);
foreach (\$users as \$user) {
    echo \$user->id . ' - ' . \$user->name . ' (' . \$user->email . ') - ' . \$user->created_at . PHP_EOL;
}
"

echo -e "\n2. Check JWT_SECRET..."
php artisan tinker --execute="
echo 'JWT_SECRET: ' . config('jwt.secret') . PHP_EOL;
echo 'JWT_SECRET exists: ' . (config('jwt.secret') ? 'YES' : 'NO') . PHP_EOL;
"

echo -e "\n3. Test registration API directly..."
curl -X POST "https://kaushalschoolfurniture.com/api/v1/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test'$(date +%s)'@example.com","password":"password123"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n4. Check Laravel logs..."
tail -20 storage/logs/laravel.log | grep -i "error\|exception" | tail -5

echo -e "\n=== DONE ==="
