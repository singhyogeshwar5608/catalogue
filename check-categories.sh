cd public_html/backend

echo "=== CHECKING CATEGORIES ==="

echo "1. Count categories in database..."
php artisan tinker --execute="
\$count = \App\Models\Category::count();
echo 'Total categories: ' . \$count . PHP_EOL;
"

echo -e "\n2. Show first 5 categories..."
php artisan tinker --execute="
\$categories = \App\Models\Category::take(5)->get(['id', 'name', 'slug']);
foreach (\$categories as \$category) {
    echo \$category->id . ' - ' . \$category->name . ' (' . \$category->slug . ')' . PHP_EOL;
}
if (\$categories->count() === 0) {
    echo 'No categories found!' . PHP_EOL;
}
"

echo -e "\n3. Test categories API..."
curl -s "https://kaushalschoolfurniture.com/api/v1/v1/categories" | head -c 500

echo -e "\n=== DONE ==="
