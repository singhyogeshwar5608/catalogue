cd public_html/backend

echo "=== TEST CATEGORY API ==="

echo "1. Test categories API directly..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/categories" | jq '.' 2>/dev/null || curl -s "https://kaushalschoolfurniture.com/api/v1/v1/categories"

echo -e "\n\n2. Check response headers..."
curl -I "https://kaushalschoolfurniture.com/api/v1/v1/categories"

echo -e "\n\n3. Verify database categories..."
php artisan tinker --execute="
\$categories = \App\Models\Category::take(3)->get(['id', 'name', 'slug', 'business_type']);
foreach (\$categories as \$category) {
    echo \$category->id . ' - ' . \$category->name . ' (' . \$category->business_type . ')' . PHP_EOL;
}
echo 'Total categories: ' . \App\Models\Category::count() . PHP_EOL;
"

echo -e "\n=== DONE ==="
