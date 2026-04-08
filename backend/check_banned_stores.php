<?php

require_once 'vendor/autoload.php';

use App\Models\Store;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Checking banned stores in database...\n";
echo "Total stores in database: " . Store::count() . "\n";

$stores = Store::all();
$activeStores = [];
$bannedStores = [];

foreach ($stores as $store) {
    if ($store->is_active) {
        $activeStores[] = $store->name;
    } else {
        $bannedStores[] = $store->name;
    }
}

echo "Active stores: " . count($activeStores) . "\n";
foreach ($activeStores as $store) {
    echo "  - " . $store . "\n";
}

echo "Banned stores: " . count($bannedStores) . "\n";
foreach ($bannedStores as $store) {
    echo "  - " . $store . "\n";
}

echo "\nDone.\n";
