cd public_html/backend

echo "=== FIXING JWT_SECRET ==="

echo "1. Check current JWT_SECRET..."
grep JWT_SECRET .env || echo "JWT_SECRET not found"

echo -e "\n2. Add JWT_SECRET to .env..."
if ! grep -q "JWT_SECRET" .env; then
    echo "JWT_SECRET=base64:$(openssl rand -base64 32)" >> .env
    echo "JWT_SECRET added to .env"
else
    echo "JWT_SECRET already exists, updating..."
    sed -i '/JWT_SECRET/d' .env
    echo "JWT_SECRET=base64:$(openssl rand -base64 32)" >> .env
fi

echo -e "\n3. Verify JWT_SECRET..."
grep JWT_SECRET .env

echo -e "\n4. Clear all caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo -e "\n5. Rebuild caches..."
php artisan config:cache
php artisan route:cache

echo -e "\n6. Test JWT_SECRET..."
php artisan tinker --execute="
echo 'JWT_SECRET: ' . config('jwt.secret') . PHP_EOL;
echo 'JWT_SECRET exists: ' . (config('jwt.secret') ? 'YES' : 'NO') . PHP_EOL;
"

echo -e "\n=== JWT_SECRET FIXED ==="
