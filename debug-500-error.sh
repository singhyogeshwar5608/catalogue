cd public_html/backend

echo "=== DEBUG 500 ERROR ==="

echo "1. Check recent Laravel logs..."
tail -50 storage/logs/laravel.log | grep -i "error\|exception" | tail -10

echo -e "\n2. Check myStores specific logs..."
tail -50 storage/logs/laravel.log | grep -i "myStores" | tail -5

echo -e "\n3. Check all recent logs..."
tail -20 storage/logs/laravel.log

echo -e "\n=== DONE ==="
