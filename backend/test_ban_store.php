<?php

require_once 'vendor/autoload.php';

use App\Models\Store;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing store ban functionality...\n";

// Get first store
$store = Store::find(1);

if (!$store) {
    echo "No store found with ID 1\n";
    exit;
}

echo "Before ban:\n";
echo "Store: " . $store->name . "\n";
echo "Active: " . ($store->is_active ? 'Yes' : 'No') . "\n";

// Ban the store
$store->is_active = false;
$store->save();

echo "\nAfter ban:\n";
echo "Store: " . $store->name . "\n";
echo "Active: " . ($store->is_active ? 'Yes' : 'No') . "\n";

// Refresh to confirm
$store->refresh();
echo "\nAfter refresh:\n";
echo "Store: " . $store->name . "\n";
echo "Active: " . ($store->is_active ? 'Yes' : 'No') . "\n";

echo "\nDone.\n";
