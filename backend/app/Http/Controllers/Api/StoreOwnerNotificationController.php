<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreNotification;
use Illuminate\Http\Request;

class StoreOwnerNotificationController extends Controller
{
    /** Delete only read notifications once they are at least 24 hours old. */
    private const READ_TTL_HOURS = 24;

    /**
     * Notifications for every store owned by the authenticated user (newest first).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $storeIds = Store::query()->where('user_id', $user->id)->pluck('id');
        if ($storeIds->isEmpty()) {
            return $this->successResponse('No stores for this account.', [
                'notifications' => [],
                'unread_count' => 0,
            ]);
        }

        // Unread notifications are never auto-deleted.
        // A notification becomes eligible for deletion only after it has been read
        // and 24 hours have passed since that read timestamp.
        StoreNotification::query()
            ->whereIn('store_id', $storeIds)
            ->whereNotNull('read_at')
            ->where('read_at', '<=', now()->subHours(self::READ_TTL_HOURS))
            ->delete();

        $limit = min(100, max(1, (int) $request->query('limit', 50)));

        $rows = StoreNotification::query()
            ->whereIn('store_id', $storeIds)
            ->with('store:id,name')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $unread = StoreNotification::query()
            ->whereIn('store_id', $storeIds)
            ->whereNull('read_at')
            ->count();

        $notifications = $rows->map(function (StoreNotification $n) {
            return [
                'id' => $n->id,
                'store_id' => $n->store_id,
                'store_name' => $n->store?->name,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'meta' => $n->meta,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at?->toIso8601String(),
            ];
        })->values()->all();

        return $this->successResponse('Notifications retrieved.', [
            'notifications' => $notifications,
            'unread_count' => $unread,
        ]);
    }

    public function markRead(Request $request, StoreNotification $notification)
    {
        $storeIds = Store::query()->where('user_id', $request->user()->id)->pluck('id');
        if (! $storeIds->contains($notification->store_id)) {
            return $this->errorResponse('Not found.', 404);
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return $this->successResponse('Marked as read.', [
            'id' => $notification->id,
            'read_at' => $notification->read_at?->toIso8601String(),
        ]);
    }

    public function destroy(Request $request, StoreNotification $notification)
    {
        $storeIds = Store::query()->where('user_id', $request->user()->id)->pluck('id');
        if (! $storeIds->contains($notification->store_id)) {
            return $this->errorResponse('Not found.', 404);
        }

        if ($notification->read_at === null) {
            return $this->errorResponse('Unread notifications cannot be deleted.', 422);
        }

        if ($notification->read_at->gt(now()->subHours(self::READ_TTL_HOURS))) {
            return $this->errorResponse('Read notifications can be deleted only after 24 hours.', 422);
        }

        $notification->delete();

        return $this->successResponse('Notification deleted.', [
            'id' => $notification->id,
        ]);
    }
}
