<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class PlatformSetting extends Model
{
    public const KEY_FREE_TRIAL_DAYS = 'free_trial_days';

    /** Extra ₹ added at checkout when a merchant enables these options (stored as whole rupees, 0 allowed). */
    public const KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_INR = 'subscription_addon_payment_gateway_inr';

    public const KEY_SUBSCRIPTION_ADDON_QR_CODE_INR = 'subscription_addon_qr_code_inr';

    public const KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_HELP_INR = 'subscription_addon_payment_gateway_help_inr';

    /** Default when the row is missing or invalid (keep in sync with `DEFAULT_FREE_TRIAL_DAYS` in `src/lib/freeTrialDays.ts`). */
    public const DEFAULT_FREE_TRIAL_DAYS = 5;

    /** Shared cache key so all PHP workers see the same value; cleared when `free_trial_days` is updated. */
    private const CACHE_KEY_FREE_TRIAL_DAYS_RESOLVED = 'platform_settings.resolved.free_trial_days_int';

    protected $fillable = [
        'key',
        'value',
    ];

    public static function intValue(string $key, int $default): int
    {
        if (! Schema::hasTable('platform_settings')) {
            return $default;
        }

        $row = static::query()->where('key', $key)->first();
        if (! $row || $row->value === null || $row->value === '') {
            return $default;
        }
        $n = (int) $row->value;

        return $n > 0 ? $n : $default;
    }

    public static function freeTrialDays(): int
    {
        return (int) Cache::remember(
            self::CACHE_KEY_FREE_TRIAL_DAYS_RESOLVED,
            3600,
            static fn (): int => self::intValue(self::KEY_FREE_TRIAL_DAYS, self::DEFAULT_FREE_TRIAL_DAYS)
        );
    }

    public static function setInt(string $key, int $value): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value]
        );

        if ($key === self::KEY_FREE_TRIAL_DAYS) {
            Cache::forget(self::CACHE_KEY_FREE_TRIAL_DAYS_RESOLVED);
        }
    }

    /** Non-negative rupee amount (0 if missing or invalid). */
    public static function rupeesOrZero(string $key): int
    {
        if (! Schema::hasTable('platform_settings')) {
            return 0;
        }

        $row = static::query()->where('key', $key)->first();
        if (! $row || $row->value === null || $row->value === '') {
            return 0;
        }
        $n = (int) $row->value;

        return max(0, $n);
    }

    /** Persist rupee amount ≥ 0 (used for subscription add-on prices). */
    public static function setRupees(string $key, int $value): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        $n = max(0, $value);
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => (string) $n]
        );
    }

    /**
     * @return array{payment_gateway_integration_inr: int, qr_code_inr: int, payment_gateway_help_inr: int}
     */
    public static function subscriptionAddonChargesPayload(): array
    {
        if (! Schema::hasTable('platform_settings')) {
            return [
                'payment_gateway_integration_inr' => 0,
                'qr_code_inr' => 0,
                'payment_gateway_help_inr' => 0,
            ];
        }

        return [
            'payment_gateway_integration_inr' => self::rupeesOrZero(self::KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_INR),
            'qr_code_inr' => self::rupeesOrZero(self::KEY_SUBSCRIPTION_ADDON_QR_CODE_INR),
            'payment_gateway_help_inr' => self::rupeesOrZero(self::KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_HELP_INR),
        ];
    }
}
