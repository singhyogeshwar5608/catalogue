cd public_html/backend

echo "=== DEBUG STORE ERROR ==="

echo "1. Check Laravel logs for errors..."
tail -50 storage/logs/laravel.log | grep -i "error\|exception" | tail -10

echo -e "\n2. Test stores API with error details..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=1" -w "\nHTTP Status: %{http_code}\n"

echo -e "\n3. Test store by slug API..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/store/admin" -w "\nHTTP Status: %{http_code}\n"

echo -e "\n4. Check if there are any syntax errors..."
php artisan route:list | grep stores | head -5

echo -e "\n=== DONE ==="
