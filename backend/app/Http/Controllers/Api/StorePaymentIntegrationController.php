<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class StorePaymentIntegrationController extends Controller
{
    private const HELP_WHATSAPP_E164 = '917015150181';

    /** Relative to `public/` — no storage symlink required (shared hosting safe). */
    private const QR_PUBLIC_PREFIX = 'store-payment-qr';

    private function assertOwner(Request $request, Store $store): ?\Illuminate\Http\JsonResponse
    {
        if ($request->user()->role !== 'super_admin' && (int) $request->user()->id !== (int) $store->user_id) {
            return $this->errorResponse('You are not authorized to manage payment settings for this store.', 403);
        }

        return null;
    }

    private function isPublicQrPath(?string $path): bool
    {
        return is_string($path)
            && $path !== ''
            && str_starts_with($path, self::QR_PUBLIC_PREFIX.'/');
    }

    private function paymentQrPublicUrl(?string $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        if ($this->isPublicQrPath($path)) {
            $full = public_path($path);

            return is_file($full) ? asset($path) : null;
        }

        // Legacy rows: file under storage/app/public
        try {
            if (Storage::disk('public')->exists($path)) {
                return Storage::disk('public')->url($path);
            }
        } catch (\Throwable) {
            // disk misconfigured — ignore
        }

        return null;
    }

    private function deletePaymentQrFile(?string $path): void
    {
        if (! is_string($path) || $path === '') {
            return;
        }

        if ($this->isPublicQrPath($path)) {
            $full = public_path($path);
            if (is_file($full)) {
                @unlink($full);
            }

            return;
        }

        try {
            Storage::disk('public')->delete($path);
        } catch (\Throwable) {
            // ignore
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Store $store): array
    {
        $addons = $store->subscription_addons ?? [];
        $secret = $store->razorpay_key_secret;

        return [
            'subscription_addons' => [
                'payment_gateway' => (bool) ($addons['payment_gateway'] ?? false),
                'qr_code' => (bool) ($addons['qr_code'] ?? false),
                'payment_gateway_help' => (bool) ($addons['payment_gateway_help'] ?? false),
            ],
            'razorpay_key_id' => $store->razorpay_key_id,
            'has_razorpay_secret' => is_string($secret) && $secret !== '',
            'payment_qr_url' => $this->paymentQrPublicUrl($store->payment_qr_path),
            'help_whatsapp_e164' => self::HELP_WHATSAPP_E164,
            'help_whatsapp_url' => 'https://wa.me/'.self::HELP_WHATSAPP_E164,
        ];
    }

    public function show(Request $request, Store $store)
    {
        if ($deny = $this->assertOwner($request, $store)) {
            return $deny;
        }

        return $this->successResponse('Payment integration settings retrieved.', $this->payload($store));
    }

    public function update(Request $request, Store $store)
    {
        if ($deny = $this->assertOwner($request, $store)) {
            return $deny;
        }

        $addons = $store->subscription_addons ?? [];
        $allowPg = (bool) ($addons['payment_gateway'] ?? false);
        $allowQr = (bool) ($addons['qr_code'] ?? false);

        $validator = Validator::make($request->all(), [
            'razorpay_key_id' => 'sometimes|nullable|string|max:255',
            'razorpay_key_secret' => 'sometimes|nullable|string|max:512',
            'clear_razorpay_secret' => 'sometimes|boolean',
            'payment_qr' => 'sometimes|nullable|file|image|mimes:jpeg,jpg,png,webp|max:4096',
            'remove_payment_qr' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if ($request->boolean('remove_payment_qr')) {
            if (! $allowQr) {
                return $this->errorResponse('QR code add-on is not enabled for this store.', 403);
            }
            $this->deletePaymentQrFile($store->payment_qr_path);
            $store->payment_qr_path = null;
        }

        if ($request->hasFile('payment_qr')) {
            if (! $allowQr) {
                return $this->errorResponse('QR code add-on is not enabled for this store.', 403);
            }

            $this->deletePaymentQrFile($store->payment_qr_path);

            $file = $request->file('payment_qr');
            $mime = $file->getMimeType() ?: '';
            $ext = match ($mime) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                default => strtolower((string) $file->getClientOriginalExtension()) ?: 'png',
            };
            if ($ext === 'jpeg') {
                $ext = 'jpg';
            }
            if (! in_array($ext, ['jpg', 'png', 'webp'], true)) {
                $ext = 'png';
            }

            $dirRelative = self::QR_PUBLIC_PREFIX.'/'.$store->id;
            $dirAbsolute = public_path($dirRelative);
            if (! is_dir($dirAbsolute) && ! @mkdir($dirAbsolute, 0755, true) && ! is_dir($dirAbsolute)) {
                return $this->errorResponse('Could not create upload directory on the server.', 500);
            }

            $basename = Str::uuid()->toString().'.'.$ext;
            $file->move($dirAbsolute, $basename);
            $store->payment_qr_path = $dirRelative.'/'.$basename;
        }

        if ($request->boolean('clear_razorpay_secret')) {
            if (! $allowPg) {
                return $this->errorResponse('Payment gateway add-on is not enabled for this store.', 403);
            }
            $store->razorpay_key_secret = null;
        }

        if ($request->exists('razorpay_key_id')) {
            if (! $allowPg) {
                return $this->errorResponse('Payment gateway add-on is not enabled for this store.', 403);
            }
            $store->razorpay_key_id = $request->input('razorpay_key_id') === ''
                ? null
                : $request->string('razorpay_key_id')->toString();
        }

        if ($request->exists('razorpay_key_secret')) {
            if (! $allowPg) {
                return $this->errorResponse('Payment gateway add-on is not enabled for this store.', 403);
            }
            $secret = $request->input('razorpay_key_secret');
            if (is_string($secret) && $secret !== '') {
                $store->razorpay_key_secret = $secret;
            }
        }

        $store->save();

        return $this->successResponse('Payment settings saved.', $this->payload($store->fresh()));
    }
}
