'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  getMyFollowNotifications,
  getMyStoreNotifications,
  markFollowNotificationRead,
  markStoreNotificationRead,
} from '@/src/lib/api';
import type { CombinedNotificationItem } from '@/src/lib/combinedNotifications';
import { mergeNotifications } from '@/src/lib/combinedNotifications';
import { useAuth } from '@/src/context/AuthContext';

export default function DashboardNotificationsBell() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CombinedNotificationItem[]>([]);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    setNotificationsLoading(true);
    try {
      const [owner, follower] = await Promise.all([
        getMyStoreNotifications({ limit: 24 }),
        getMyFollowNotifications({ limit: 24 }),
      ]);
      setNotifications(mergeNotifications(owner.notifications, follower.notifications));
      setNotificationsUnread(owner.unread_count + follower.unread_count);
    } catch {
      // keep stable if notification endpoint fails
    } finally {
      setNotificationsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadNotifications();
    const id = window.setInterval(() => {
      void loadNotifications();
    }, 7000);
    return () => window.clearInterval(id);
  }, [isLoggedIn, loadNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (notificationsPanelRef.current && target && !notificationsPanelRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [notificationsOpen]);

  const handleNotificationClick = async (row: CombinedNotificationItem) => {
    const notification = row.notification;
    if (!notification.read_at) {
      try {
        if (row.source === 'owner') {
          await markStoreNotificationRead(notification.id);
        } else {
          await markFollowNotificationRead(notification.id);
        }
        const ts = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((item): CombinedNotificationItem => {
            if (item.source !== row.source || item.notification.id !== notification.id) return item;
            if (item.source === 'owner') {
              return { source: 'owner', notification: { ...item.notification, read_at: ts } };
            }
            return { source: 'follower', notification: { ...item.notification, read_at: ts } };
          })
        );
        setNotificationsUnread((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore read-mark failure in quick panel
      }
    }
    setNotificationsOpen(false);
    const pid =
      row.source === 'follower' && typeof notification.meta?.product_id === 'number'
        ? notification.meta.product_id
        : null;
    if (pid != null) {
      router.push(`/product/${pid}`);
      return;
    }
    router.push('/dashboard/notifications');
  };

  if (!isLoggedIn) return null;

  return (
    <div ref={notificationsPanelRef} className="relative">
      <button
        type="button"
        onClick={() => setNotificationsOpen((prev) => !prev)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {notificationsUnread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {notificationsUnread > 9 ? '9+' : notificationsUnread}
          </span>
        ) : null}
      </button>
      {notificationsOpen ? (
        <div className="fixed right-3 top-[calc(env(safe-area-inset-top,0px)+3.8rem)] z-[70] w-[min(92vw,340px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:absolute md:right-0 md:top-full md:z-[60] md:mt-2 md:w-[min(90vw,340px)]">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notifications</p>
          </div>
          <div className="max-h-72 overflow-auto">
            {notificationsLoading ? (
              <p className="px-3 py-4 text-sm text-slate-500">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No notifications yet.</p>
            ) : (
              notifications.slice(0, 6).map((row) => {
                const n = row.notification;
                return (
                  <button
                    key={`${row.source}-${n.id}`}
                    type="button"
                    onClick={() => void handleNotificationClick(row)}
                    className={`block w-full border-b border-slate-100 px-3 py-2 text-left transition hover:bg-slate-50 ${
                      n.read_at ? 'bg-white' : 'bg-primary/[0.04]'
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">{n.title || 'Notification'}</p>
                    {n.body ? <p className="truncate text-xs text-slate-600">{n.body}</p> : null}
                  </button>
                );
              })
            )}
          </div>
          <div className="px-3 py-2">
            <Link href="/dashboard/notifications" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
