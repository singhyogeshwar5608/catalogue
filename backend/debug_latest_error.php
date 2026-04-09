<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Checking latest Laravel logs for store creation errors...\n";

// Check Laravel logs for recent errors
$logFile = storage_path('logs/laravel.log');
if (file_exists($logFile)) {
    echo "Last 30 lines from Laravel log:\n";
    $lines = file($logFile);
    $lastLines = array_slice($lines, -30);
    foreach ($lastLines as $line) {
        echo $line;
    }
} else {
    echo "No Laravel log file found.\n";
}

echo "\nDone.\n";
