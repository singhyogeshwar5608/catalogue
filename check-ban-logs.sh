cd public_html/backend

echo "=== CHECK BAN LOGS ==="

echo "1. Check recent Laravel logs for ban updates..."
tail -50 storage/logs/laravel.log | grep -i "Updating store\|Store refreshed" | tail -10

echo -e "\n2. Check for any errors..."
tail -50 storage/logs/laravel.log | grep -i "error\|exception" | tail -5

echo -e "\n=== DONE ==="
