<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SubscriptionPlansSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'price' => 0,
                'billing_cycle' => 'monthly',
                'duration_days' => 7,
                'max_products' => 5,
                'is_popular' => false,
                'is_active' => true,
                'features' => json_encode([
                    'Up to 5 products',
                    'Basic store customization',
                    'Standard support',
                    'Mobile responsive',
                    '7 days trial',
                ]),
                'description' => 'Perfect for getting started - 7 days free trial',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Basic',
                'slug' => 'basic',
                'price' => 299,
                'billing_cycle' => 'monthly',
                'duration_days' => 30,
                'max_products' => 25,
                'is_popular' => false,
                'is_active' => true,
                'features' => json_encode([
                    'Up to 25 products',
                    'Advanced customization',
                    'Priority support',
                    'Analytics dashboard',
                    'Custom domain',
                    '30 days subscription',
                ]),
                'description' => 'Great for small businesses - 30 days',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price' => 999,
                'billing_cycle' => 'monthly',
                'duration_days' => 30,
                'max_products' => 100,
                'is_popular' => true,
                'is_active' => true,
                'features' => json_encode([
                    'Up to 100 products',
                    'Premium themes',
                    '24/7 support',
                    'Advanced analytics',
                    'SEO optimization',
                    'Marketing tools',
                    'API access',
                    '30 days subscription',
                ]),
                'description' => 'Most popular for growing businesses - 30 days',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price' => 2999,
                'billing_cycle' => 'monthly',
                'duration_days' => 30,
                'max_products' => 999999,
                'is_popular' => false,
                'is_active' => true,
                'features' => json_encode([
                    'Unlimited products',
                    'Custom development',
                    'Dedicated support',
                    'Advanced integrations',
                    'White-label solution',
                    'Priority features',
                    'Custom analytics',
                    'Multi-store management',
                    '30 days subscription',
                ]),
                'description' => 'For large enterprises - 30 days',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        DB::table('subscription_plans')->insert($plans);
    }
}
