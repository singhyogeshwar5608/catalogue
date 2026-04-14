'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CreditCard, Eye, Heart, Loader2, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import {
  deleteStoreNotification,
  getMyStoreNotifications,
  markStoreNotificationRead,
  type StoreOwnerNotification,
} from '@/src/lib/api';

/** Near real-time refresh while this tab is visible (WebSockets can be added later). */
const POLL_MS = 2500;

function iconForType(type: string) {
  switch (type) {
    case 'follow':
      return UserPlus;
    case 'like':
      return Heart;
    case 'seen':
      return Eye;
    case 'subscription':
      return CreditCard;
    default:
      return Bell;
  }
}

function formatWhen(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardNotificationsPage() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<StoreOwnerNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabVisible = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { notifications, unread_count } = await getMyStoreNotifications({ limit: 80 });
      setItems(notifications);
      setUnread(unread_count);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace('/auth?redirect=/dashboard/notifications');
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    const onVis = () => {
      tabVisible.current = document.visibilityState === 'visible';
      if (tabVisible.current) {
        void fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isLoggedIn || authLoading) return undefined;
    void fetchNotifications();
    const id = window.setInterval(() => {
      if (tabVisible.current) {
        void fetchNotifications();
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoggedIn, authLoading, fetchNotifications]);

  const handleOpen = async (n: StoreOwnerNotification) => {
    if (n.read_at) return;
    try {
      await markStoreNotificationRead(n.id);
      const ts = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: ts } : x)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (n: StoreOwnerNotification) => {
    try {
      await deleteStoreNotification(n.id);
      setItems((prev) => prev.filter((item) => item.id !== n.id));
      if (!n.read_at) {
        setUnread((u) => Math.max(0, u - 1));
      }
    } catch {
      // ignore
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" strokeWidth={2.2} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600 md:text-base">Refresh your page for latest notification.</p>
          </div>
        </div>
        {unread > 0 ? (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {unread} unread
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <p className="text-gray-600">No notifications yet. When shoppers engage with your store, they will show up here.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <ul className="space-y-1.5 sm:space-y-2">
          {items.map((n) => {
            const Icon = iconForType(n.type);
            const isUnread = !n.read_at;
            return (
              <li key={n.id}>
                <div
                  onClick={() => void handleOpen(n)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left shadow-sm transition hover:bg-gray-50 sm:gap-3 sm:px-4 sm:py-2.5 ${
                    isUnread ? 'border-primary/30 bg-primary/[0.04]' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
                      n.type === 'like'
                        ? 'bg-rose-100 text-rose-600'
                        : n.type === 'follow'
                          ? 'bg-sky-100 text-sky-600'
                          : n.type === 'seen'
                            ? 'bg-violet-100 text-violet-600'
                            : n.type === 'subscription'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1.5">
                     
                      {n.body ? (
                        <span className="min-w-0 truncate text-xs text-gray-600 sm:flex-1">
                          {n.body}
                        </span>
                      ) : null}
                      {isUnread ? (
                        <>
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary sm:hidden" aria-label="New notification" />
                          <span className="hidden shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:inline-flex">
                            New
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">{formatWhen(n.created_at)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(n);
                      }}
                      className="inline-flex items-center rounded-md border border-rose-200 px-1.5 py-1 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50 sm:px-2"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
