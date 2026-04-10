<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Store extends Model
{
    protected $fillable = [
        'user_id',
        'category_id',
        'name',
        'slug',
        'username',
        'logo',
        'banner',
        'phone',
        'email',
        'whatsapp',
        'show_phone',
        'facebook_url',
        'instagram_url',
        'youtube_url',
        'linkedin_url',
        'address',
        'location',
        'latitude',
        'longitude',
        'description',
        'short_description',
        'layout_type',
        'theme',
        'rating',
        'total_reviews',
        'is_verified',
        'is_boosted',
        'boost_expiry_date',
        'is_active',
    ];

    protected $casts = [
        'rating' => 'decimal:1',
        'total_reviews' => 'integer',
        'is_verified' => 'boolean',
        'is_boosted' => 'boolean',
        'is_active' => 'boolean',
        'show_phone' => 'boolean',
        'boost_expiry_date' => 'date',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function boosts(): HasMany
    {
        return $this->hasMany(StoreBoost::class);
    }

    public function activeBoost(): HasOne
    {
        // Temporarily disable latestOfMany to avoid SQLite issues
        return $this->hasOne(StoreBoost::class)
            ->where('status', 'active')
            ->orderBy('ends_at', 'desc');
    }

    public function storeSubscriptions(): HasMany
    {
        return $this->hasMany(StoreSubscription::class);
    }

    public function activeSubscription(): HasOne
    {
        // Temporarily disable latestOfMany to avoid SQLite issues
        return $this->hasOne(StoreSubscription::class)
            ->where('status', 'active')
            ->orderBy('ends_at', 'desc');
    }
}
