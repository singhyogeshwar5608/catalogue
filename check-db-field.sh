cd public_html/backend

echo "=== CHECK DATABASE FIELD ==="

echo "1. Check stores table structure..."
php artisan tinker --execute="
\$columns = \Illuminate\Support\Facades\Schema::getColumnListing('stores');
echo 'Stores table columns:' . PHP_EOL;
foreach (\$columns as \$column) {
    if (strpos(\$column, 'active') !== false) {
        echo '- ' . \$column . PHP_EOL;
    }
}
"

echo -e "\n2. Check current store data..."
php artisan tinker --execute="
\$store = \App\Models\Store::first();
if (\$store) {
    echo 'Store ID: ' . \$store->id . PHP_EOL;
    echo 'is_active: ' . (\$store->is_active ?? 'NULL') . PHP_EOL;
    echo 'active: ' . (\$store->active ?? 'NULL') . PHP_EOL;
    echo 'Raw attributes:' . PHP_EOL;
    \$attrs = \$store->getAttributes();
    foreach (\$attrs as \$key => \$value) {
        if (strpos(\$key, 'active') !== false) {
            echo '- ' . \$key . ': ' . (\$value ?? 'NULL') . PHP_EOL;
        }
    }
}
"

echo -e "\n=== DONE ==="
