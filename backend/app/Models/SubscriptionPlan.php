<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'price',
        'billing_cycle',
        'duration_days',
        'max_products',
        'is_popular',
        'is_active',
        'features',
        'description',
    ];

    protected $casts = [
        'price' => 'integer',
        'duration_days' => 'integer',
        'max_products' => 'integer',
        'is_popular' => 'boolean',
        'is_active' => 'boolean',
        'features' => 'array',
    ];

    public function storeSubscriptions(): HasMany
    {
        return $this->hasMany(StoreSubscription::class);
    }
}
