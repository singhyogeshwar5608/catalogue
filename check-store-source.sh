cd public_html/backend

echo "=== WHAT DOES STORES API RETURN ==="

echo "1. Test stores API..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=3" | jq '.' 2>/dev/null || curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=3"

echo -e "\n\n2. Check if response is from database or hardcoded..."
php artisan tinker --execute="
\$stores = \App\Models\Store::count();
echo 'Actual stores in DB: ' . \$stores . PHP_EOL;
echo 'If API shows stores but DB shows 0, then data is hardcoded!' . PHP_EOL;
"

echo -e "\n3. Check StoreController for hardcoded data..."
grep -r "sample\|mock\|example\|test" app/Http/Controllers/Api/StoreController.php | head -5

echo -e "\n=== DONE ==="
