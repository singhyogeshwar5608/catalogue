<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Product images are stored on the public disk under {@see self::DIR} (storage/app/public/products).
 * The database holds a short path (e.g. products/uuid.jpg) or legacy full URLs / data URLs.
 * API responses use {@see toPublicUrl()} so clients always receive an absolute URL when possible.
 */
final class ProductImageStorage
{
    public const DISK = 'public';

    public const DIR = 'products';

    /**
     * Store an uploaded file and return the relative path (e.g. products/abc.jpg).
     */
    public static function storeUploaded(UploadedFile $file): string
    {
        return $file->store(self::DIR, self::DISK);
    }

    /**
     * Persist a client-supplied value: multipart file, data-URL base64, existing path, or external URL.
     * Returns a value safe to store in DB (relative path under storage/app/public, or pass-through URL).
     */
    public static function persistIncomingImage(mixed $image, ?string $previousStored = null): ?string
    {
        if ($image === null) {
            return null;
        }
        if ($image instanceof UploadedFile) {
            self::deleteStoredIfReplaced($previousStored);

            return self::storeUploaded($image);
        }
        if (! is_string($image)) {
            return $previousStored;
        }
        $trimmed = trim($image);
        if ($trimmed === '') {
            return null;
        }
        if (str_starts_with($trimmed, 'data:image')) {
            $saved = self::persistDataUrl($trimmed);
            if ($saved !== null) {
                self::deleteStoredIfReplaced($previousStored);
            }

            return $saved ?? $previousStored;
        }
        // Already a relative path we manage
        if (str_starts_with($trimmed, self::DIR.'/')) {
            return $trimmed;
        }
        // Legacy / new: full URL or absolute storage path — keep as-is
        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')
            || str_starts_with($trimmed, '/storage/')) {
            return $trimmed;
        }

        return $trimmed;
    }

    /**
     * Convert stored DB value to a public URL for JSON responses.
     */
    public static function toPublicUrl(?string $stored): ?string
    {
        if ($stored === null || $stored === '') {
            return null;
        }
        $stored = trim($stored);
        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://')) {
            return $stored;
        }
        // Still base64 in DB (pre-migration): avoid sending huge payloads — frontend can show placeholder
        if (str_starts_with($stored, 'data:image')) {
            return null;
        }
        if (str_starts_with($stored, '/storage/')) {
            return asset(ltrim($stored, '/'));
        }
        if (str_starts_with($stored, self::DIR.'/')) {
            return Storage::disk(self::DISK)->url($stored);
        }

        return Storage::disk(self::DISK)->url($stored);
    }

    /**
     * @param  array<int, mixed>|null  $images
     * @return array<int, string>|null
     */
    public static function toPublicUrlArray(?array $images): ?array
    {
        if ($images === null || $images === []) {
            return $images;
        }
        $out = [];
        foreach ($images as $item) {
            if (! is_string($item) || trim($item) === '') {
                continue;
            }
            $url = self::toPublicUrl($item);
            if ($url !== null && $url !== '') {
                $out[] = $url;
            }
        }

        return $out === [] ? [] : array_values($out);
    }

    /**
     * Mutate product attributes to public URLs for API output (does not persist).
     */
    public static function decorateProductForResponse(\App\Models\Product $product): void
    {
        $product->setAttribute('image', self::toPublicUrl($product->getAttribute('image')));
        $imgs = $product->getAttribute('images');
        if (is_array($imgs)) {
            $product->setAttribute('images', self::toPublicUrlArray($imgs) ?? []);
        }
    }

    /**
     * Delete a file we previously stored under products/ when it is replaced or the product is removed.
     */
    public static function deleteStoredIfManaged(?string $stored): void
    {
        if ($stored === null || $stored === '') {
            return;
        }
        if (str_starts_with($stored, 'http://') || str_starts_with($stored, 'https://')) {
            return;
        }
        $path = $stored;
        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, strlen('/storage/'));
        }
        if (! str_starts_with($path, self::DIR.'/')) {
            return;
        }
        Storage::disk(self::DISK)->delete($path);
    }

    private static function persistDataUrl(string $dataUrl): ?string
    {
        if (! preg_match('#^data:image/(png|jpeg|jpg|webp);base64,#i', $dataUrl)) {
            return null;
        }
        $comma = strpos($dataUrl, ',');
        if ($comma === false) {
            return null;
        }
        $raw = base64_decode(substr($dataUrl, $comma + 1), true);
        if ($raw === false || $raw === '') {
            return null;
        }
        if (strlen($raw) > 4_000_000) {
            return null;
        }
        $head = strtolower(substr($dataUrl, 0, 48));
        $ext = 'jpg';
        if (str_contains($head, 'image/png')) {
            $ext = 'png';
        } elseif (str_contains($head, 'image/webp')) {
            $ext = 'webp';
        }
        $relative = self::DIR.'/'.Str::uuid()->toString().'.'.$ext;
        Storage::disk(self::DISK)->put($relative, $raw);

        return $relative;
    }

    private static function deleteStoredIfReplaced(?string $previous): void
    {
        self::deleteStoredIfManaged($previous);
    }
}
