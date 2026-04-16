"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Bell,
  Briefcase,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  Facebook,
  Home,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Package,
  Plus,
  Printer,
  QrCode,
  Star,
  Store as StoreIcon,
  Users,
  UserPlus,
  Heart,
  X,
  Youtube,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  getApiRequestBaseUrl,
  getMyStoreNotifications,
  getProductsByStore,
  markStoreNotificationRead,
  getStoreBySlugFromApi,
  getStoreSubscription,
  isApiError,
  type StoreOwnerNotification,
  updateStore,
} from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { getDashboardExpiryWarningDaysRemaining, isPaidSubscriptionActive } from '@/src/lib/storeAccess';
import type { Product, Store, StoreSubscription, SubscriptionPlan } from '@/types';
import SubscriptionExpiryPopup from '@/components/SubscriptionExpiryPopup';
import ProductLimitPopup from '@/components/ProductLimitPopup';
import BoostExpiryPopup from '@/components/BoostExpiryPopup';

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

type DashboardStatVariant = 'violet' | 'sky' | 'amber' | 'indigo' | 'rose' | 'teal';

type DashboardStatItem = {
  label: string;
  value: string;
  icon: LucideIcon;
  variant: DashboardStatVariant;
};

const DASHBOARD_STAT_STYLES: Record<
  DashboardStatVariant,
  { card: string; iconWrap: string; label: string }
> = {
  violet: {
    card: 'border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40',
    iconWrap: 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25',
    label: 'text-violet-800/80',
  },
  sky: {
    card: 'border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/40',
    iconWrap: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25',
    label: 'text-sky-800/80',
  },
  amber: {
    card: 'border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40',
    iconWrap: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25',
    label: 'text-amber-900/70',
  },
  indigo: {
    card: 'border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/40',
    iconWrap: 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25',
    label: 'text-indigo-800/80',
  },
  rose: {
    card: 'border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-pink-50/40',
    iconWrap: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25',
    label: 'text-rose-800/80',
  },
  teal: {
    card: 'border-teal-200/90 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/40',
    iconWrap: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25',
    label: 'text-teal-800/80',
  },
};

function DashboardStatCard({ item }: { item: DashboardStatItem }) {
  const s = DASHBOARD_STAT_STYLES[item.variant];
  const Icon = item.icon;
  return (
    <div className={`dashboard-stat-card rounded-2xl border p-4 shadow-sm transition hover:shadow-md sm:p-5 ${s.card}`}>
      <div className={`dashboard-stat-icon mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${s.iconWrap}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <p className={`dashboard-stat-label text-[11px] font-bold uppercase tracking-[0.14em] ${s.label}`}>{item.label}</p>
      <p className="dashboard-stat-value mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{item.value}</p>
    </div>
  );
}

/** Billing length from catalog plan (duration_days or billing_cycle). */
function describePlanBillingDuration(plan: SubscriptionPlan): string {
  const d = plan.durationDays;
  if (d && d > 0) {
    if (d % 365 === 0) return d === 365 ? '1 year' : `${d / 365} years`;
    if (d % 30 === 0) return d === 30 ? '1 month' : `${d / 30} months`;
    if (d === 7) return '1 week';
    return `${d} days`;
  }
  return plan.billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
}

function subscriptionPeriodEndLabel(endsAt: string): string {
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return '';
  return end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Active subscription row: API plan name + duration + current period end. */
function formatActiveSubscriptionPlanLine(sub: StoreSubscription): string {
  const name = (sub.plan.name ?? sub.plan.slug ?? '').trim() || 'Subscription';
  const end = subscriptionPeriodEndLabel(sub.endsAt);
  const left = daysUntil(sub.endsAt);
  const suffix =
    left != null && left >= 0 && sub.status === 'active'
      ? ` · ${left} day${left === 1 ? '' : 's'} left`
      : '';
  return end ? `${name} · until ${end}${suffix}` : `${name}${suffix}`;
}

/** True only for a paid plan period — not the platform default `free` slug row from signup. */
export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const [myStore, setMyStore] = useState<Store | null>(null);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [showSubscriptionExpiry, setShowSubscriptionExpiry] = useState(false);
  const [showProductLimit, setShowProductLimit] = useState(false);
  const [showBoostExpiry, setShowBoostExpiry] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
    youtube: '',
    linkedin: '',
  });
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);
  const [socialLinksMessage, setSocialLinksMessage] = useState<string | null>(null);
  const [openSocialPlatform, setOpenSocialPlatform] = useState<keyof typeof socialLinks | null>(null);
  const socialInputRefs = useRef<Partial<Record<keyof typeof socialLinks, HTMLInputElement | null>>>({});
  const [showPhone, setShowPhone] = useState(true);
  const [savingPhoneVisibility, setSavingPhoneVisibility] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<StoreOwnerNotification[]>([]);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);

  const hasProducts = myProducts.length > 0;
  const storeUrl = myStore ? `https://cateloge.com/store/${myStore.username}` : '';
  const prettyUrl = storeUrl.replace(/^https?:\/\//, '');

  const loadStoreData = useCallback(async () => {
    if (!user?.storeSlug) {
      setLoading(false);
      setError('You need to create a store first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const store = await getStoreBySlugFromApi(user.storeSlug);
      const products = await getProductsByStore(store.id);
      if (!store) {
        setError('Store not found');
        return;
      }

      setMyStore(store);
      setMyProducts(products ?? []);

      try {
        const subData = await getStoreSubscription(store.id);
        setSubscription(subData.activeSubscription);

        if (subData.activeSubscription) {
          const remainingDays = getDashboardExpiryWarningDaysRemaining(store, subData.activeSubscription);

          if (remainingDays != null && remainingDays <= 7 && remainingDays >= 0) {
            setShowSubscriptionExpiry(true);
          }

          if (products && products.length >= subData.activeSubscription.plan.maxProducts) {
            setShowProductLimit(true);
          }
        }
      } catch (subErr) {
        console.error('Failed to load subscription:', subErr);
      }

      if (store.activeBoost) {
        const boostEndsAt = new Date(store.activeBoost.endsAt);
        const remainingDays = Math.ceil((boostEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if (store.activeBoost.status === 'expired' || remainingDays <= 3) {
          setShowBoostExpiry(true);
        }
      }
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          router.replace('/auth?redirect=/dashboard');
          return;
        }
        setError(err.message || 'Unable to load store data');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load store data');
      }
    } finally {
      setLoading(false);
    }
  }, [router, user?.storeSlug]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/auth?redirect=/dashboard');
      return;
    }
    loadStoreData();
  }, [isLoggedIn, loadStoreData, router]);

  useEffect(() => {
    if (!myStore) return;
    setShowPhone(myStore.showPhone !== false);
    setSocialLinks({
      facebook: myStore.socialLinks?.facebook ?? '',
      instagram: myStore.socialLinks?.instagram ?? '',
      youtube: myStore.socialLinks?.youtube ?? '',
      linkedin: myStore.socialLinks?.linkedin ?? '',
    });
  }, [myStore]);

  useEffect(() => {
    if (!showQRModal || !canvasRef.current) return;

    let isMounted = true;
    (async () => {
      const QRCode = await import('qrcode');
      if (!isMounted || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, storeUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      });
    })();

    return () => {
      isMounted = false;
    };
  }, [showQRModal, storeUrl]);

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'store-qr-code.png';
    link.href = url;
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) return;
    newWindow.document.write(`<img src="${dataUrl}" style="width:100%;max-width:480px;" />`);
    newWindow.document.close();
    newWindow.focus();
    newWindow.print();
  };

  const hasActivePaidSubscription = useMemo(() => isPaidSubscriptionActive(subscription), [subscription]);

  const trialStillActive = useMemo(() => {
    if (!myStore?.trialEndsAt) return false;
    const end = new Date(myStore.trialEndsAt).getTime();
    return !Number.isNaN(end) && end > Date.now();
  }, [myStore?.trialEndsAt]);

  const trialDurationDaysLabel = useMemo(() => {
    if (!myStore?.trialEndsAt || !myStore?.createdAt) return null;
    const ms = new Date(myStore.trialEndsAt).getTime() - new Date(myStore.createdAt).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const days = Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
    return `${days} day${days === 1 ? '' : 's'}`;
  }, [myStore?.trialEndsAt, myStore?.createdAt]);

  const planSummaryText = useMemo(() => {
    if (!myStore) return '—';

    const activeSub = subscription ?? myStore.activeSubscription ?? null;
    const endsMs = activeSub ? new Date(activeSub.endsAt).getTime() : NaN;
    const periodStillOpen =
      activeSub &&
      activeSub.status === 'active' &&
      !Number.isNaN(endsMs) &&
      endsMs > Date.now();

    if (periodStillOpen && activeSub) {
      return formatActiveSubscriptionPlanLine(activeSub);
    }

    if (trialStillActive) {
      const trialEnd = myStore.trialEndsAt ? subscriptionPeriodEndLabel(myStore.trialEndsAt) : '';
      const trialLeft = daysUntil(myStore.trialEndsAt);
      const trialSuffix =
        trialLeft != null && trialLeft >= 0 ? ` · ${trialLeft} day${trialLeft === 1 ? '' : 's'} left` : '';
      const base = trialDurationDaysLabel ? `Free trial (${trialDurationDaysLabel})` : 'Free trial';
      return trialEnd ? `${base} · ends ${trialEnd}${trialSuffix}` : `${base}${trialSuffix}`;
    }

    if (activeSub) {
      const name = (activeSub.plan.name ?? activeSub.plan.slug ?? '').trim() || 'Subscription';
      const ended = !Number.isNaN(endsMs) && endsMs <= Date.now();
      if (ended || activeSub.status === 'expired' || activeSub.status === 'cancelled') {
        const status =
          activeSub.status === 'expired' || activeSub.status === 'cancelled'
            ? activeSub.status
            : 'period ended';
        const lastEnd = subscriptionPeriodEndLabel(activeSub.endsAt);
        return lastEnd ? `${name} — ${status} · was until ${lastEnd}` : `${name} — ${status}`;
      }
      return formatActiveSubscriptionPlanLine(activeSub);
    }

    return '—';
  }, [myStore, subscription, trialDurationDaysLabel, trialStillActive]);

  const catalogDashboardStats = useMemo((): DashboardStatItem[] => {
    if (!myStore) return [];
    const productLabel =
      myStore.businessType === 'service'
        ? 'Services'
        : myStore.businessType === 'hybrid'
          ? 'Listings'
          : 'Products';
    const ProductIcon = myStore.businessType === 'service' ? Briefcase : Package;
    return [
      {
        label: productLabel,
        value: String(myProducts.length),
        icon: ProductIcon,
        variant: 'violet',
      },
      {
        label: 'Reviews',
        value: String(myStore.totalReviews),
        icon: Users,
        variant: 'sky',
      },
      {
        label: 'Rating',
        value: `${myStore.rating}/5`,
        icon: Star,
        variant: 'amber',
      },
    ];
  }, [myProducts.length, myStore]);

  const audienceDashboardStats = useMemo((): DashboardStatItem[] => {
    if (!myStore) return [];
    return [
      {
        label: 'Followers',
        value: String(myStore.followersCount ?? 0),
        icon: UserPlus,
        variant: 'indigo',
      },
      {
        label: 'Likes',
        value: String(myStore.likesCount ?? 0),
        icon: Heart,
        variant: 'rose',
      },
      {
        label: 'Seen',
        value: String(myStore.seenCount ?? 0),
        icon: Eye,
        variant: 'teal',
      },
    ];
  }, [myStore]);

  const socialPlatforms = [
    { key: 'facebook', label: 'Facebook', prefix: 'facebook.com/', icon: Facebook, iconClassName: 'text-[#1877f2]' },
    { key: 'instagram', label: 'Instagram', prefix: 'instagram.com/', icon: Instagram, iconClassName: 'text-[#e1306c]' },
    { key: 'youtube', label: 'YouTube', prefix: 'youtube.com/@', icon: Youtube, iconClassName: 'text-[#ff0000]' },
    { key: 'linkedin', label: 'LinkedIn', prefix: 'linkedin.com/in/', icon: Linkedin, iconClassName: 'text-[#0077b5]' },
  ] as const;

  const handleSocialLinkChange = (key: keyof typeof socialLinks, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!openSocialPlatform) return;
    const focusTimer = window.requestAnimationFrame(() => {
      socialInputRefs.current[openSocialPlatform]?.focus();
    });
    return () => window.cancelAnimationFrame(focusTimer);
  }, [openSocialPlatform]);

  const handleSaveSocialLinks = async () => {
    if (!myStore || savingSocialLinks) return;

    setSavingSocialLinks(true);
    setSocialLinksMessage(null);
    try {
      const trimmed = {
        facebook: socialLinks.facebook.trim(),
        instagram: socialLinks.instagram.trim(),
        youtube: socialLinks.youtube.trim(),
        linkedin: socialLinks.linkedin.trim(),
      };
      const { store } = await updateStore({
        id: myStore.id,
        facebook_url: trimmed.facebook || null,
        instagram_url: trimmed.instagram || null,
        youtube_url: trimmed.youtube || null,
        linkedin_url: trimmed.linkedin || null,
      });
      setMyStore(store);
      setSocialLinks({
        facebook: store.socialLinks?.facebook?.trim() || trimmed.facebook,
        instagram: store.socialLinks?.instagram?.trim() || trimmed.instagram,
        youtube: store.socialLinks?.youtube?.trim() || trimmed.youtube,
        linkedin: store.socialLinks?.linkedin?.trim() || trimmed.linkedin,
      });
      setSocialLinksMessage('Social links saved');
    } catch (err) {
      setSocialLinksMessage(isApiError(err) ? err.message : 'Unable to save social links');
    } finally {
      setSavingSocialLinks(false);
    }
  };

  const handlePhoneVisibilityToggle = async () => {
    if (!myStore || savingPhoneVisibility) return;

    const nextValue = !showPhone;
    setShowPhone(nextValue);
    setSavingPhoneVisibility(true);
    try {
      const { store } = await updateStore({
        id: myStore.id,
        show_phone: nextValue,
      });
      setMyStore(store);
    } catch (err) {
      setShowPhone(!nextValue);
    } finally {
      setSavingPhoneVisibility(false);
    }
  };

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    setNotificationsLoading(true);
    try {
      const payload = await getMyStoreNotifications({ limit: 12 });
      setNotifications(payload.notifications);
      setNotificationsUnread(payload.unread_count);
    } catch {
      // keep dashboard stable if notification endpoint fails
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

  const handleNotificationClick = async (notification: StoreOwnerNotification) => {
    if (!notification.read_at) {
      try {
        await markStoreNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((row) =>
            row.id === notification.id ? { ...row, read_at: new Date().toISOString() } : row
          )
        );
        setNotificationsUnread((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore read-mark failure in quick panel
      }
    }
    setNotificationsOpen(false);
    router.push('/dashboard/notifications');
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
          <p className="mt-4 text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !myStore) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error || 'Store not found. Please create a store first.'}
      </div>
    );
  }

  const subscriptionExpiryPopupDaysRemaining = getDashboardExpiryWarningDaysRemaining(myStore, subscription);
  const boostDaysRemaining = daysUntil(myStore?.activeBoost?.endsAt);

  return (
    <div className="dashboard-mobile mx-auto min-w-0 max-w-6xl space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-white shadow-lg sm:px-6 max-md:rounded-[14px] max-md:border-transparent max-md:bg-[#0f2027] max-md:px-[14px] max-md:py-[10px]">
        <div className="hidden items-center justify-between gap-2 max-md:flex">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#162530]">
            <CreditCard className="h-4 w-4 text-[#2dd4bf]" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[12px] font-bold leading-none text-white">{planSummaryText}</p>
              <span className="shrink-0 rounded-full bg-[#2dd4bf]/20 px-1.5 py-0.5 text-[9px] font-medium leading-none text-[#2dd4bf]">
                Active
              </span>
            </div>
            <p className="mt-1 truncate text-[9px] font-bold leading-none text-white">{planSummaryText}</p>
            <div className="mt-1.5 h-[3px] w-full max-w-[120px] overflow-hidden rounded-full bg-white/20">
              <span className="block h-full w-[14%] rounded-full bg-[#2dd4bf]" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/dashboard/subscription')}
            className="shrink-0 rounded-[8px] bg-[#2dd4bf] px-3 py-1.5 text-[10px] font-medium leading-none text-[#0f2027]"
          >
            Upgrade
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-md:hidden">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <CreditCard className="h-5 w-5 text-amber-200" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Current plan</p>
              <p className="mt-0.5 text-base font-bold leading-snug text-white sm:text-lg">{planSummaryText}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="audience-card w-full max-w-[380px] rounded-[14px] border-[0.5px] border-[#e4e9f0] bg-white px-[12px] py-[4px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="audience-inline-grid flex items-center justify-between">
          <div className="flex flex-1 flex-col items-center gap-[1px]">
            <div className="flex items-center gap-[5px]">
              <UserPlus className="h-3 w-3 text-[#0d9488]" strokeWidth={2} />
              <p className="text-[13px] font-medium leading-none text-[#111827] tabular-nums">
                {(myStore.followersCount ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <p className="text-[8px] leading-none tracking-[0.03em] text-[#9ca3af]">Followers</p>
          </div>

          <div className="h-4 w-[0.5px] bg-[#e4e9f0]" />

          <div className="flex flex-1 flex-col items-center gap-[1px]">
            <div className="flex items-center gap-[5px]">
              <Heart className="h-3 w-3 text-[#0d9488]" strokeWidth={2} />
              <p className="text-[13px] font-medium leading-none text-[#111827] tabular-nums">
                {(myStore.likesCount ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <p className="text-[8px] leading-none tracking-[0.03em] text-[#9ca3af]">Likes</p>
          </div>

          <div className="h-4 w-[0.5px] bg-[#e4e9f0]" />

          <div className="flex flex-1 flex-col items-center gap-[1px]">
            <div className="flex items-center gap-[5px]">
              <Eye className="h-3 w-3 text-[#0d9488]" strokeWidth={2} />
              <p className="text-[13px] font-medium leading-none text-[#111827] tabular-nums">
                {(myStore.seenCount ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <p className="text-[8px] leading-none tracking-[0.03em] text-[#9ca3af]">Views</p>
          </div>
        </div>
      </div>

      <section className="dashboard-hero-card relative overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 shadow-sm sm:rounded-[28px] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {(myStore.seenCount ?? 0).toLocaleString('en-IN')} people viewed today
              </span>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 sm:text-3xl">{myStore.name}</h1>
                {myStore.location ? (
                  <p className="mt-1 text-sm text-slate-500">{myStore.location}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">Add your store location so visitors know where to find you.</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div ref={notificationsPanelRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                  <div className="absolute right-0 z-30 mt-2 w-[min(90vw,340px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notifications</p>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      {notificationsLoading ? (
                        <p className="px-3 py-4 text-sm text-slate-500">Loading...</p>
                      ) : notifications.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-slate-500">No notifications yet.</p>
                      ) : (
                        notifications.slice(0, 6).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => void handleNotificationClick(n)}
                            className={`block w-full border-b border-slate-100 px-3 py-2 text-left transition hover:bg-slate-50 ${
                              n.read_at ? 'bg-white' : 'bg-primary/[0.04]'
                            }`}
                          >
                            <p className="truncate text-sm font-semibold text-slate-900">{n.title || 'Notification'}</p>
                            {n.body ? <p className="truncate text-xs text-slate-600">{n.body}</p> : null}
                          </button>
                        ))
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
              <div className="relative h-14 w-14 sm:h-16 sm:w-16">
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
                {myStore.logo ? (
                  <div className="h-full w-full overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={myStore.logo}
                      alt={myStore.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-slate-900/5 text-slate-700 shadow-md">
                    <StoreIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="-mt-1 flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-white/90 px-0.5 py-0.5 text-sm shadow-sm">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Phone className="h-4 w-4 text-slate-400" />
              {myStore.phone ? myStore.phone : 'No phone added'}
            </span>
            <button
              type="button"
              onClick={handlePhoneVisibilityToggle}
              disabled={savingPhoneVisibility}
              className={`relative ml-auto inline-flex h-6 w-10 shrink-0 rounded-full transition ${showPhone ? 'bg-emerald-500' : 'bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-60`}
              aria-pressed={showPhone}
              aria-label="Toggle phone visibility"
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${showPhone ? 'left-5' : 'left-1'}`} />
            </button>
          </div>

          <div className="dashboard-quick-links flex flex-wrap gap-2 sm:gap-3 max-md:grid max-md:grid-cols-3 max-md:gap-1">
            <Link
              href="/"
              className="dashboard-quick-link inline-flex items-center justify-center gap-1.5 rounded-full border border-indigo-700 bg-indigo-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-700 sm:px-5 sm:py-2.5 sm:text-sm max-md:w-full max-md:min-w-0 max-md:gap-1 max-md:rounded-xl max-md:px-2 max-md:py-1.5 max-md:text-[10px] max-md:leading-none max-md:whitespace-nowrap max-md:overflow-hidden max-md:text-ellipsis"
            >
              <Home className="h-4 w-4 max-md:h-3 max-md:w-3" />
              Home Page
            </Link>
            <Link
              href={`/store/${myStore.username}`}
              className="dashboard-quick-link inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800 sm:px-5 sm:py-2.5 sm:text-sm max-md:w-full max-md:min-w-0 max-md:gap-1 max-md:rounded-xl max-md:px-2 max-md:py-1.5 max-md:text-[10px] max-md:leading-none max-md:whitespace-nowrap max-md:overflow-hidden max-md:text-ellipsis"
            >
              View Store
              <ExternalLink className="h-4 w-4 max-md:h-3 max-md:w-3" />
            </Link>
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="dashboard-quick-link inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700 sm:px-5 sm:py-2.5 sm:text-sm max-md:w-full max-md:min-w-0 max-md:gap-1 max-md:rounded-xl max-md:px-2 max-md:py-1.5 max-md:text-[10px] max-md:leading-none max-md:whitespace-nowrap max-md:overflow-hidden max-md:text-ellipsis"
            >
              <QrCode className="h-4 w-4 max-md:h-3 max-md:w-3" />
              QR Code
            </button>
          </div>

          <div className="dashboard-primary-cta-row flex flex-wrap gap-2 sm:hidden">
            {(myStore.businessType === 'product' || myStore.businessType === 'hybrid') && (
              <Link
                href="/dashboard/products"
                className="dashboard-primary-cta inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            )}
            {(myStore.businessType === 'service' || myStore.businessType === 'hybrid') && (
              <Link
                href="/dashboard/products?tab=services"
                className="dashboard-secondary-cta inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Briefcase className="h-4 w-4" />
                Add Service
              </Link>
            )}
          </div>

        </div>
      </section>

      <section className="space-y-5">
        <div className="activity-card overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm sm:rounded-[26px]">
          <div className="activity-card-header border-b border-slate-100 bg-gradient-to-r from-violet-50/50 via-white to-sky-50/40 px-5 py-4 sm:px-6">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <BarChart3 className="h-3.5 w-3.5 text-violet-600" aria-hidden />
              Store activity
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Catalog & reviews</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">Listings, reviews, and how buyers rate your store.</p>
          </div>
          <div className="activity-grid grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
            {catalogDashboardStats.map((item) => (
              <DashboardStatCard key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div className="social-links-card w-full max-w-[430px] rounded-2xl border bg-white p-5 shadow-sm sm:p-6" style={{ borderWidth: '0.5px', borderColor: '#e8e8e8' }}>
          <div className="mt-0 grid gap-2.5">
            {socialPlatforms.map((platform) => {
              const Icon = platform.icon;
              const isOpen = openSocialPlatform === platform.key;
              return (
                <div key={platform.key} className="rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenSocialPlatform((prev) => (prev === platform.key ? null : platform.key))}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`social-panel-${platform.key}`}
                  >
                    <span className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <Icon className={`h-4.5 w-4.5 ${platform.iconClassName}`} />
                      {platform.label}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div id={`social-panel-${platform.key}`} className="border-t border-slate-100 px-3.5 pb-3.5 pt-3">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {platform.prefix}
                        </span>
                        <input
                          ref={(node) => {
                            socialInputRefs.current[platform.key] = node;
                          }}
                          type="text"
                          inputMode="url"
                          autoComplete="url"
                          value={socialLinks[platform.key]}
                          onChange={(event) => handleSocialLinkChange(platform.key, event.target.value)}
                          className="w-full rounded-xl border border-slate-200 py-2.5 pl-[7.35rem] pr-3 text-sm text-slate-700 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {socialLinksMessage ? (
              <p className={`text-sm ${socialLinksMessage === 'Social links saved' ? 'text-emerald-600' : 'text-slate-500'}`}>{socialLinksMessage}</p>
            ) : null}
            <button
              type="button"
              onClick={handleSaveSocialLinks}
              disabled={savingSocialLinks}
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition duration-[800ms] active:opacity-80 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: '#1a1a2e' }}
            >
              {savingSocialLinks ? 'Saving…' : 'Save social links'}
            </button>
          </div>
        </div>

      </section>

      <section className="dashboard-lower-grid grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="dashboard-lower-stack space-y-4">
        </div>

      </section>

      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 py-3 sm:items-center">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">QR Code</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Store QR</h2>
              </div>
              <button type="button" onClick={() => setShowQRModal(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3">
                <canvas ref={canvasRef} className="h-36 w-36 sm:h-44 sm:w-44" />
              </div>
              <div className="w-full rounded-2xl bg-slate-950 px-3 py-3 text-center text-[11px] font-mono tracking-wide text-white break-all">
                {prettyUrl}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
              >
                <Download className="h-4 w-4" />
                Save
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubscriptionExpiry && subscription && (
        <SubscriptionExpiryPopup
          planName={subscription.plan.name}
          daysRemaining={subscriptionExpiryPopupDaysRemaining ?? 0}
          onClose={() => setShowSubscriptionExpiry(false)}
        />
      )}

      {showProductLimit && subscription && (
        <ProductLimitPopup
          currentProducts={myProducts.length}
          maxProducts={subscription.plan.maxProducts}
          planName={subscription.plan.name}
          onClose={() => setShowProductLimit(false)}
        />
      )}

      {showBoostExpiry && myStore?.activeBoost && (
        <BoostExpiryPopup
          boostPlanName={myStore.activeBoost.plan.name}
          isExpired={myStore.activeBoost.status === 'expired'}
          daysRemaining={myStore.activeBoost.status === 'expired' ? undefined : boostDaysRemaining ?? undefined}
          onClose={() => setShowBoostExpiry(false)}
        />
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .dashboard-mobile {
            gap: 0.75rem;
          }

          .dashboard-hero-card {
            padding: 0.75rem;
          }

          .dashboard-hero-card h1 {
            font-size: 1.2rem;
          }

          .dashboard-hero-card p {
            font-size: 0.8rem;
          }

          .dashboard-primary-cta-row {
            margin-top: 0.25rem;
          }

          .dashboard-quick-links {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.4rem;
          }

          .dashboard-quick-link {
            width: 100%;
            min-width: 0;
            padding: 0.3rem 0.2rem;
            font-size: 0.58rem;
            gap: 0.15rem;
            border-radius: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.1;
          }

          .dashboard-quick-link :global(svg) {
            height: 0.68rem;
            width: 0.68rem;
            flex-shrink: 0;
          }

          .dashboard-primary-cta {
            flex: 1 1 100%;
            min-height: 2.5rem;
          }

          .dashboard-secondary-cta {
            min-height: 2.5rem;
          }

          .audience-card,
          .activity-card {
            border-radius: 1rem;
          }

          .audience-card > div:first-child,
          .activity-card > div:first-child {
            padding: 0.75rem 0.875rem;
          }

          .activity-card-header {
            display: none;
          }

          .audience-card-heading {
            display: none;
          }

          .audience-card h2,
          .activity-card h2 {
            font-size: 1rem;
          }

          .audience-card p,
          .activity-card p {
            font-size: 0.75rem;
          }

          .audience-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.35rem;
            padding: 0.45rem;
          }

          .activity-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.3rem;
            padding: 0.4rem;
          }

          .activity-grid :global(.dashboard-stat-card) {
            padding: 0.25rem 0.2rem;
            border-radius: 0.65rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-height: 0;
          }

          .activity-grid :global(.dashboard-stat-icon) {
            height: 1rem;
            width: 1rem;
            margin-bottom: 0.1rem;
          }

          .activity-grid :global(.dashboard-stat-label) {
            font-size: 0.5rem;
            letter-spacing: 0.05em;
            line-height: 1.1;
          }

          .activity-grid :global(.dashboard-stat-value) {
            font-size: 0.86rem;
            margin-top: 0.05rem;
            line-height: 1.1;
          }

          .dashboard-stat-card {
            padding: 0.35rem;
            border-radius: 0.7rem;
            box-shadow: none;
            min-height: auto;
          }

          .dashboard-stat-icon {
            height: 1.3rem;
            width: 1.3rem;
            margin-bottom: 0.2rem;
            border-radius: 0.45rem;
          }

          .dashboard-stat-label {
            font-size: 0.46rem;
            letter-spacing: 0.07em;
          }

          .dashboard-stat-value {
            margin-top: 0.1rem;
            font-size: 0.7rem;
            line-height: 1.2;
          }

          .dashboard-lower-grid {
            margin-top: 0.25rem;
          }

          .dashboard-lower-stack {
            display: flex;
            flex-direction: column;
            gap: 0.625rem;
          }

          .social-links-card,
          .empty-state-card {
            padding: 0.875rem;
            border-radius: 1rem;
          }

          .empty-state-card {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
}
