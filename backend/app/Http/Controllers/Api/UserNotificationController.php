<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    /** Delete only read notifications once they are at least 24 hours old. */
    private const READ_TTL_HOURS = 24;

    /**
     * In-app notifications for the authenticated user (e.g. followed store posted a new product).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        UserNotification::query()
            ->where('user_id', $user->id)
            ->whereNotNull('read_at')
            ->where('read_at', '<=', now()->subHours(self::READ_TTL_HOURS))
            ->delete();

        $limit = min(100, max(1, (int) $request->query('limit', 50)));

        $rows = UserNotification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $unread = UserNotification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        $notifications = $rows->map(function (UserNotification $n) {
            return [
                'id' => $n->id,
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

    public function markRead(Request $request, UserNotification $notification)
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
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

    public function destroy(Request $request, UserNotification $notification)
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
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
