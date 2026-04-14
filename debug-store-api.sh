cd public_html/backend

echo "=== DEBUG STORE API ==="

echo "1. Test stores API..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/stores?limit=5" | head -c 500

echo -e "\n\n2. Check Laravel logs..."
tail -20 storage/logs/laravel.log | grep -i "error\|exception" | tail -5

echo -e "\n3. Test specific store API..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/store/test-store" | head -c 500

echo -e "\n=== DONE ==="
