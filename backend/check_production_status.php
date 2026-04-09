<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Checking production status...\n";

// Check if we're using SQLite
echo "Database driver: " . config('database.default') . "\n";

// Check Store model relationships
$store = new \App\Models\Store();
echo "Store model loaded successfully\n";

// Test a simple query to see if it works
try {
    $count = \App\Models\Store::count();
    echo "Store count query successful: $count stores\n";
} catch (Exception $e) {
    echo "Store count query failed: " . $e->getMessage() . "\n";
}

// Test creating a simple store to see what happens
echo "\nTesting store creation...\n";
try {
    $user = \App\Models\User::first();
    if (!$user) {
        echo "No users found in database\n";
        exit;
    }
    
    echo "Found user: " . $user->email . "\n";
    
    // Check if user already has a store
    if ($user->stores()->exists()) {
        echo "User already has a store\n";
    } else {
        echo "User can create a store\n";
    }
} catch (Exception $e) {
    echo "Error checking user: " . $e->getMessage() . "\n";
}

echo "\nDone.\n";
