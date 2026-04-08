<?php

require_once 'vendor/autoload.php';

use App\Models\Store;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Checking database stores...\n";
echo "Total stores in database: " . Store::count() . "\n";

$stores = Store::all();
foreach ($stores as $store) {
    echo "Store: " . $store->name . " (ID: " . $store->id . ", Active: " . ($store->is_active ? 'Yes' : 'No') . ")\n";
}

echo "\nDone.\n";
