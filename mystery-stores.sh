cd public_html/backend

echo "=== CRITICAL API TEST ==="

echo "1. Test stores API directly..."
response=$(curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5")
echo "API Response: $response"

echo -e "\n2. Parse JSON response..."
echo "$response" | jq '.data | length' 2>/dev/null || echo "Invalid JSON or jq not available"

echo -e "\n3. Check if response contains sample data..."
echo "$response" | grep -i "kaushal\|construction\|pet\|farm" || echo "No sample data found in response"

echo -e "\n4. Verify database count..."
php artisan tinker --execute="
\$count = \App\Models\Store::count();
echo 'Database stores count: ' . \$count . PHP_EOL;
"

echo -e "\n5. Check if API is hitting different database..."
php artisan tinker --execute="
echo 'Current database: ' . config('database.connections.mysql.database') . PHP_EOL;
echo 'Database host: ' . config('database.connections.mysql.host') . PHP_EOL;
"

echo -e "\n=== MYSTERY TO SOLVE ==="
