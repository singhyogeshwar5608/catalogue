<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreFollow;
use App\Models\StoreLike;
use App\Models\StoreSeenHit;
use App\Support\StoreNotificationRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class StoreEngagementController extends Controller
{
    private const GUEST_UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

    /** Each visitor (user or guest) can add at most this many to `stores.seen_count` per store. */
    private const MAX_SEEN_HITS_PER_ACTOR = 10;

    public function toggleFollow(Request $request, Store $store): \Illuminate\Http\JsonResponse
    {
        return $this->toggle($request, $store, 'follow');
    }

    public function toggleLike(Request $request, Store $store): \Illuminate\Http\JsonResponse
    {
        return $this->toggle($request, $store, 'like');
    }

    /**
     * Record a storefront visit. Same actor_key rules as follow/like (JWT or guest_token).
     * Each actor contributes at most {@see self::MAX_SEEN_HITS_PER_ACTOR} increments to `stores.seen_count` per store.
     */
    public function recordSeen(Request $request, Store $store): \Illuminate\Http\JsonResponse
    {
        if (! Schema::hasTable('store_seen_hits') || ! Schema::hasColumn('stores', 'seen_count')) {
            return $this->errorResponse('Store visit tracking is not available. Run database migrations.', 503);
        }

        // Prefer a real JWT user over guest_token: if `sub` is non-numeric, `resolveActorKey` can fall through to
        // `g:*` while the visitor is actually the logged-in store owner — that would wrongly increment seen_count.
        if ($this->authenticatedUserOwnsStore($request, $store)) {
            return $this->successResponse('Store owner views are not counted.', [
                'seen_count' => (int) ($store->seen_count ?? 0),
                'counted' => false,
                'your_hits' => 0,
                'capped' => false,
            ]);
        }

        $actorKey = $this->resolveActorKey($request);
        if ($actorKey === null) {
            return $this->successResponse('Visit not counted.', [
                'seen_count' => (int) ($store->seen_count ?? 0),
                'counted' => false,
                'your_hits' => 0,
                'capped' => false,
            ]);
        }

        if ($this->actorOwnsStore($actorKey, $store)) {
            return $this->successResponse('Store owner views are not counted.', [
                'seen_count' => (int) ($store->seen_count ?? 0),
                'counted' => false,
                'your_hits' => 0,
                'capped' => false,
            ]);
        }

        try {
            $result = DB::transaction(function () use ($store, $actorKey) {
                $storeRow = Store::query()->whereKey($store->id)->lockForUpdate()->first();
                if (! $storeRow) {
                    return null;
                }

                $row = StoreSeenHit::query()
                    ->where('store_id', $storeRow->id)
                    ->where('actor_key', $actorKey)
                    ->lockForUpdate()
                    ->first();

                if ($row === null) {
                    StoreSeenHit::query()->create([
                        'store_id' => $storeRow->id,
                        'actor_key' => $actorKey,
                        'hit_count' => 1,
                    ]);
                    $storeRow->increment('seen_count');

                    return [
                        'seen_count' => (int) $storeRow->fresh()->seen_count,
                        'counted' => true,
                        'your_hits' => 1,
                        'capped' => false,
                    ];
                }

                if ($row->hit_count >= self::MAX_SEEN_HITS_PER_ACTOR) {
                    return [
                        'seen_count' => (int) $storeRow->seen_count,
                        'counted' => false,
                        'your_hits' => self::MAX_SEEN_HITS_PER_ACTOR,
                        'capped' => true,
                    ];
                }

                $row->increment('hit_count');
                $storeRow->increment('seen_count');

                return [
                    'seen_count' => (int) $storeRow->fresh()->seen_count,
                    'counted' => true,
                    'your_hits' => (int) $row->fresh()->hit_count,
                    'capped' => false,
                ];
            });
        } catch (\Throwable $e) {
            report($e);

            return $this->errorResponse('Could not record visit.', 500);
        }

        if ($result === null) {
            return $this->errorResponse('Store not found.', 404);
        }

        $message = $result['counted']
            ? 'Visit recorded.'
            : (($result['capped'] ?? false) ? 'Your view limit for this store is reached.' : 'Visit not counted.');

        if (($result['counted'] ?? false) && (int) ($result['your_hits'] ?? 0) === 1) {
            StoreNotificationRecorder::seen($store, $actorKey, (int) ($result['seen_count'] ?? 0));
        }

        return $this->successResponse($message, $result);
    }

    private function toggle(Request $request, Store $store, string $kind): \Illuminate\Http\JsonResponse
    {
        $table = $kind === 'follow' ? 'store_follows' : 'store_likes';
        $countColumn = $kind === 'follow' ? 'followers_count' : 'likes_count';
        if (! Schema::hasTable($table) || ! Schema::hasColumn('stores', $countColumn)) {
            return $this->errorResponse('Store engagement is not available. Run database migrations.', 503);
        }

        $actorKey = $this->resolveActorKey($request);
        if ($actorKey === null) {
            return $this->errorResponse('Sign in or send guest_token (UUID v4) in the JSON body.', 422);
        }

        if ($this->actorOwnsStore($actorKey, $store)) {
            return $this->errorResponse('You cannot follow or like your own store.', 400);
        }

        $modelClass = $kind === 'follow' ? StoreFollow::class : StoreLike::class;

        try {
            $payload = DB::transaction(function () use ($modelClass, $store, $actorKey, $countColumn, $kind) {
                $storeRow = Store::query()->whereKey($store->id)->lockForUpdate()->first();
                if (! $storeRow) {
                    return null;
                }

                $hadRow = $modelClass::query()
                    ->where('store_id', $storeRow->id)
                    ->where('actor_key', $actorKey)
                    ->exists();

                if ($hadRow) {
                    $modelClass::query()
                        ->where('store_id', $storeRow->id)
                        ->where('actor_key', $actorKey)
                        ->delete();
                    DB::table('stores')->where('id', $storeRow->id)->update([
                        $countColumn => DB::raw('CASE WHEN '.$countColumn.' > 0 THEN '.$countColumn.' - 1 ELSE 0 END'),
                    ]);
                    $nowActive = false;
                } else {
                    $nowActive = false;
                    try {
                        $modelClass::query()->create([
                            'store_id' => $storeRow->id,
                            'actor_key' => $actorKey,
                        ]);
                        DB::table('stores')->where('id', $storeRow->id)->increment($countColumn);
                        $nowActive = true;
                    } catch (\Illuminate\Database\QueryException $e) {
                        if ($e->getCode() !== '23000' && ! str_contains(strtolower($e->getMessage()), 'unique')) {
                            throw $e;
                        }
                        $nowActive = $modelClass::query()
                            ->where('store_id', $storeRow->id)
                            ->where('actor_key', $actorKey)
                            ->exists();
                    }
                }

                $fresh = Store::query()->find($storeRow->id);

                return [
                    'followers_count' => (int) ($fresh?->followers_count ?? 0),
                    'likes_count' => (int) ($fresh?->likes_count ?? 0),
                    'viewer_following' => $kind === 'follow' ? $nowActive : null,
                    'viewer_liked' => $kind === 'like' ? $nowActive : null,
                ];
            });
        } catch (\Throwable $e) {
            report($e);

            return $this->errorResponse('Could not update engagement.', 500);
        }

        if ($payload === null) {
            return $this->errorResponse('Store not found.', 404);
        }

        if ($kind === 'follow' && $payload['viewer_following']) {
            StoreNotificationRecorder::follow($store, $actorKey, (int) $payload['followers_count']);
        }
        if ($kind === 'like' && $payload['viewer_liked']) {
            StoreNotificationRecorder::like($store, $actorKey, (int) $payload['likes_count']);
        }

        if ($kind === 'follow') {
            return $this->successResponse(
                $payload['viewer_following'] ? 'You are now following this store.' : 'You unfollowed this store.',
                [
                    'followers_count' => $payload['followers_count'],
                    'likes_count' => $payload['likes_count'],
                    'viewer_following' => (bool) $payload['viewer_following'],
                ]
            );
        }

        return $this->successResponse(
            $payload['viewer_liked'] ? 'Thanks for liking this store.' : 'Like removed.',
            [
                'followers_count' => $payload['followers_count'],
                'likes_count' => $payload['likes_count'],
                'viewer_liked' => (bool) $payload['viewer_liked'],
            ]
        );
    }

    /**
     * @return array{viewer_following: bool, viewer_liked: bool}
     */
    public static function viewerEngagementFor(Store $store, Request $request): array
    {
        if (! Schema::hasTable('store_follows') || ! Schema::hasTable('store_likes')) {
            return ['viewer_following' => false, 'viewer_liked' => false];
        }

        $actor = (new self)->resolveActorKey($request);
        if ($actor === null) {
            return ['viewer_following' => false, 'viewer_liked' => false];
        }

        return [
            'viewer_following' => StoreFollow::query()
                ->where('store_id', $store->id)
                ->where('actor_key', $actor)
                ->exists(),
            'viewer_liked' => StoreLike::query()
                ->where('store_id', $store->id)
                ->where('actor_key', $actor)
                ->exists(),
        ];
    }

    /**
     * True when the request carries a valid Bearer JWT for the user who owns this store.
     * Used before guest-based actor resolution so owner visits never hit `g:*` counting.
     */
    private function authenticatedUserOwnsStore(Request $request, Store $store): bool
    {
        $token = $request->bearerToken();
        if (! is_string($token) || $token === '') {
            return false;
        }

        try {
            JWTAuth::setToken($token);
            $user = JWTAuth::authenticate();
            if ($user === null) {
                return false;
            }

            return (int) $store->user_id === (int) $user->getAuthIdentifier();
        } catch (\Throwable) {
            return false;
        }
    }

    private function actorOwnsStore(string $actorKey, Store $store): bool
    {
        if (str_starts_with($actorKey, 'u:')) {
            $id = (int) substr($actorKey, 2);

            return $id > 0 && (int) $store->user_id === $id;
        }

        return false;
    }

    private function resolveActorKey(Request $request): ?string
    {
        $bearer = $request->bearerToken();
        if (is_string($bearer) && $bearer !== '') {
            try {
                JWTAuth::setToken($bearer);
                $sub = JWTAuth::getPayload()->get('sub');
                if ($sub !== null && is_numeric($sub)) {
                    return 'u:'.(int) $sub;
                }
            } catch (\Throwable) {
                // fall through to guest
            }
        }

        $guest = $request->input('guest_token') ?? $request->query('guest_token');
        if (is_string($guest) && preg_match(self::GUEST_UUID, $guest)) {
            return 'g:'.strtolower($guest);
        }

        return null;
    }
}
