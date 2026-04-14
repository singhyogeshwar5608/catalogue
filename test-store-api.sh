cd public_html/backend

echo "=== TEST STORE API ==="

echo "1. Test the store API that was failing..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/store/aniket-stoe" | head -c 1000

echo -e "\n\n2. Check HTTP status..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/store/aniket-stoe" -w "\nHTTP Status: %{http_code}\n"

echo -e "\n3. Check Laravel logs for any errors..."
tail -20 storage/logs/laravel.log | grep -i "error\|exception" | tail -5

echo -e "\n4. Test stores API to make sure it works..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=1" | head -c 500

echo -e "\n=== DONE ==="
