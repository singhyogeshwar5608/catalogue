cd public_html/backend

echo "=== DATABASE CONNECTION CHECK ==="

echo "1. Current database config..."
php artisan tinker --execute="
echo 'Database Driver: ' . config('database.default') . PHP_EOL;
echo 'Database Name: ' . config('database.connections.mysql.database') . PHP_EOL;
echo 'Database Host: ' . config('database.connections.mysql.host') . PHP_EOL;
echo 'Database Port: ' . config('database.connections.mysql.port') . PHP_EOL;
"

echo -e "\n2. Test database connection..."
php artisan tinker --execute="
try {
    \DB::connection()->getPdo();
    echo 'Database connection: SUCCESS' . PHP_EOL;
} catch (\Exception \$e) {
    echo 'Database connection: FAILED - ' . \$e->getMessage() . PHP_EOL;
}
"

echo -e "\n3. Check all tables..."
php artisan tinker --execute="
\$tables = \DB::select('SHOW TABLES');
foreach (\$tables as \$table) {
    \$tableName = array_values((array) \$table)[0];
    if (strpos(\$tableName, 'store') !== false) {
        \$count = \DB::table(\$tableName)->count();
        echo \$tableName . ': ' . \$count . ' records' . PHP_EOL;
    }
}
"

echo -e "\n=== DONE ==="
