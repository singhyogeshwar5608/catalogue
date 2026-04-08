<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            // Add missing columns that the seeder expects
            if (!Schema::hasColumn('stores', 'username')) {
                $table->string('username')->unique()->after('slug');
            }
            if (!Schema::hasColumn('stores', 'email')) {
                $table->string('email')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('stores', 'location')) {
                $table->string('location')->nullable()->after('address');
            }
            if (!Schema::hasColumn('stores', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('location');
            }
            if (!Schema::hasColumn('stores', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
            if (!Schema::hasColumn('stores', 'is_boosted')) {
                $table->boolean('is_boosted')->default(false)->after('is_verified');
            }
            if (!Schema::hasColumn('stores', 'business_type')) {
                $table->string('business_type')->nullable()->after('category_id');
            }
            
            // Index will be added separately if needed
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $columnsToDrop = [
                'username',
                'email', 
                'location',
                'latitude',
                'longitude',
                'is_boosted',
                'business_type',
            ];
            
            foreach ($columnsToDrop as $column) {
                if (Schema::hasColumn('stores', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
