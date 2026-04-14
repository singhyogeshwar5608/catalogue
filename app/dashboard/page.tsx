"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
<<<<<<< HEAD
=======
  Bell,
>>>>>>> origin/main
  Briefcase,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Facebook,
  Home,
  Instagram,
  Linkedin,
  MapPin,
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
<<<<<<< HEAD
=======
  Loader2,
>>>>>>> origin/main
  type LucideIcon,
} from 'lucide-react';
import {
  getApiRequestBaseUrl,
<<<<<<< HEAD
=======
  getMyStoreNotifications,
>>>>>>> origin/main
  getProductsByStore,
  getStoreBySlugFromApi,
  getStoreSubscription,
  isApiError,
<<<<<<< HEAD
=======
  markStoreNotificationRead,
  type StoreOwnerNotification,
>>>>>>> origin/main
  updateStore,
} from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { getDashboardExpiryWarningDaysRemaining, isPaidSubscriptionActive } from '@/src/lib/storeAccess';
import type { Product, Store, StoreSubscription, SubscriptionPlan } from '@/types';
import SubscriptionExpiryPopup from '@/components/SubscriptionExpiryPopup';
import ProductLimitPopup from '@/components/ProductLimitPopup';
import BoostExpiryPopup from '@/components/BoostExpiryPopup';
import TrialCountdownBanner from '@/components/TrialCountdownBanner';

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
    <div className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md sm:p-5 ${s.card}`}>
      <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${s.iconWrap}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${s.label}`}>{item.label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{item.value}</p>
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

<<<<<<< HEAD
=======
function dashboardNotificationIcon(type: string) {
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

function dashboardNotificationTime(iso?: string | null): string {
  if (! iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

>>>>>>> origin/main
/** Active subscription row: API plan name + duration + current period end. */
function formatActiveSubscriptionPlanLine(sub: StoreSubscription): string {
  const name = (sub.plan.name ?? sub.plan.slug ?? '').trim() || 'Subscription';
  const period = describePlanBillingDuration(sub.plan);
  const end = subscriptionPeriodEndLabel(sub.endsAt);
  const left = daysUntil(sub.endsAt);
  const suffix =
    left != null && left >= 0 && sub.status === 'active'
      ? ` · ${left} day${left === 1 ? '' : 's'} left`
      : '';
  return end ? `${name} (${period}) · until ${end}${suffix}` : `${name} (${period})${suffix}`;
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
  const [showPhone, setShowPhone] = useState(true);
  const [savingPhoneVisibility, setSavingPhoneVisibility] = useState(false);
<<<<<<< HEAD
=======
  const [headerNotifOpen, setHeaderNotifOpen] = useState(false);
  const [headerNotifs, setHeaderNotifs] = useState<StoreOwnerNotification[]>([]);
  const [headerUnread, setHeaderUnread] = useState(0);
  const [headerNotifLoading, setHeaderNotifLoading] = useState(false);
  const headerNotifWrapRef = useRef<HTMLDivElement>(null);
>>>>>>> origin/main

  const hasProducts = myProducts.length > 0;
  const storeUrl = myStore ? `https://cateloge.com/store/${myStore.username}` : '';
  const prettyUrl = storeUrl.replace(/^https?:\/\//, '');

<<<<<<< HEAD
=======
  const loadHeaderNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      setHeaderNotifLoading(true);
      const payload = await getMyStoreNotifications({ limit: 8 });
      setHeaderNotifs(payload.notifications);
      setHeaderUnread(payload.unread_count);
    } catch {
      // Ignore header notification fetch failures.
    } finally {
      setHeaderNotifLoading(false);
    }
  }, [isLoggedIn]);

>>>>>>> origin/main
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
<<<<<<< HEAD
=======
    if (!isLoggedIn) return undefined;
    void loadHeaderNotifications();
    const id = window.setInterval(() => {
      void loadHeaderNotifications();
    }, 3000);
    return () => window.clearInterval(id);
  }, [isLoggedIn, loadHeaderNotifications]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (headerNotifWrapRef.current && !headerNotifWrapRef.current.contains(target)) {
        setHeaderNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
>>>>>>> origin/main
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
      const period = describePlanBillingDuration(activeSub.plan);
      const ended = !Number.isNaN(endsMs) && endsMs <= Date.now();
      if (ended || activeSub.status === 'expired' || activeSub.status === 'cancelled') {
        const status =
          activeSub.status === 'expired' || activeSub.status === 'cancelled'
            ? activeSub.status
            : 'period ended';
        const lastEnd = subscriptionPeriodEndLabel(activeSub.endsAt);
        return lastEnd ? `${name} (${period}) — ${status} · was until ${lastEnd}` : `${name} (${period}) — ${status}`;
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

<<<<<<< HEAD
=======
  const shouldShowSubscriptionNudge = useMemo(() => {
    if (!myStore) return false;
    return !hasActivePaidSubscription && !trialStillActive;
  }, [hasActivePaidSubscription, myStore, trialStillActive]);

  const subscriptionNudgeMetrics = useMemo(() => {
    const followers = Math.max(0, myStore?.followersCount ?? 0);
    const likes = Math.max(0, myStore?.likesCount ?? 0);
    const seen = Math.max(0, myStore?.seenCount ?? 0);
    const engagedUsers = followers + likes + seen;
    // Conservative estimate so copy feels realistic on early-stage stores too.
    const potentialExtraFollowers = Math.max(5, Math.ceil(engagedUsers * 0.25));
    return { engagedUsers, potentialExtraFollowers };
  }, [myStore?.followersCount, myStore?.likesCount, myStore?.seenCount]);

>>>>>>> origin/main
  const socialPlatforms = [
    { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourstore', icon: Facebook },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourstore', icon: Instagram },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourstore', icon: Youtube },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourstore', icon: Linkedin },
  ] as const;

  const handleSocialLinkChange = (key: keyof typeof socialLinks, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [key]: value }));
  };

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

<<<<<<< HEAD
=======
  const markHeaderNotificationRead = async (notification: StoreOwnerNotification) => {
    if (notification.read_at) return;
    try {
      await markStoreNotificationRead(notification.id);
      const nowIso = new Date().toISOString();
      setHeaderNotifs((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, read_at: nowIso } : item))
      );
      setHeaderUnread((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

>>>>>>> origin/main
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
    <div className="mx-auto min-w-0 max-w-6xl space-y-4 sm:space-y-6">
<<<<<<< HEAD
=======
      <div className="flex justify-end">
        <div className="relative" ref={headerNotifWrapRef}>
          <button
            type="button"
            onClick={() => setHeaderNotifOpen((prev) => !prev)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5" />
            {headerUnread > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {headerUnread > 99 ? '99+' : headerUnread}
              </span>
            ) : null}
          </button>

          {headerNotifOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setHeaderNotifOpen(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {headerNotifLoading && headerNotifs.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : headerNotifs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {headerNotifs.map((n) => {
                      const Icon = dashboardNotificationIcon(n.type);
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => void markHeaderNotificationRead(n)}
                            className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                              !n.read_at ? 'bg-primary/[0.04]' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="line-clamp-1 text-sm font-semibold text-slate-900">{n.title}</span>
                                  {!n.read_at ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                                </span>
                                {n.body ? <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">{n.body}</span> : null}
                                <span className="mt-1 block text-[11px] text-slate-400">{dashboardNotificationTime(n.created_at)}</span>
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
>>>>>>> origin/main
      <TrialCountdownBanner
        trialEndsAt={myStore.trialEndsAt}
        createdAt={myStore.createdAt}
        apiBaseUrl={getApiRequestBaseUrl()}
        hasActiveSubscription={hasActivePaidSubscription}
      />

      <section className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 shadow-sm sm:rounded-[28px] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Dashboard overview
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
            <div className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16">
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

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-600 backdrop-blur-sm sm:px-4">
            <div className="flex flex-col">
              <span className="uppercase text-[11px] font-semibold tracking-wide text-slate-500">Phone visibility</span>
              <span className="text-sm font-medium text-slate-900">
                {myStore.phone ? myStore.phone : 'No phone added'}
              </span>
            </div>
            <button
              type="button"
              onClick={handlePhoneVisibilityToggle}
              disabled={savingPhoneVisibility}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${showPhone ? 'bg-slate-900' : 'bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-60`}
              aria-pressed={showPhone}
              aria-label="Toggle phone visibility"
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${showPhone ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <Home className="h-4 w-4" />
              Home Page
            </Link>
            <Link
              href={`/store/${myStore.username}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              View Store
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <QrCode className="h-4 w-4" />
              QR Code
            </button>
          </div>

          <div className="flex flex-wrap gap-2 sm:hidden">
            {(myStore.businessType === 'product' || myStore.businessType === 'hybrid') && (
              <Link
                href="/dashboard/products"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            )}
            {(myStore.businessType === 'service' || myStore.businessType === 'hybrid') && (
              <Link
                href="/dashboard/products?tab=services"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Briefcase className="h-4 w-4" />
                Add Service
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm sm:rounded-[26px]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50/50 via-white to-indigo-50/40 px-5 py-4 sm:px-6">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
              <Heart className="h-3.5 w-3.5 text-rose-500" aria-hidden />
              Your audience
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Followers, likes & seen</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Engagement from your public store page. Each visitor can add at most ten to your Seen total.
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
            {audienceDashboardStats.map((item) => (
              <DashboardStatCard key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm sm:rounded-[26px]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/50 via-white to-sky-50/40 px-5 py-4 sm:px-6">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <BarChart3 className="h-3.5 w-3.5 text-violet-600" aria-hidden />
              Store activity
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Catalog & reviews</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">Listings, reviews, and how buyers rate your store.</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
            {catalogDashboardStats.map((item) => (
              <DashboardStatCard key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <CreditCard className="h-5 w-5 text-amber-200" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Current plan</p>
              <p className="mt-0.5 text-base font-semibold leading-snug text-white sm:text-lg">{planSummaryText}</p>
            </div>
          </div>
        </div>
<<<<<<< HEAD
=======

        {shouldShowSubscriptionNudge ? (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/70 to-rose-50/70 px-4 py-4 shadow-sm sm:px-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                <Zap className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">Subscription update</p>
                <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">
                  Aapne abhi tak koi active subscription nahi liya hai.
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-700">
                  Aap lagbhag <span className="font-semibold text-slate-900">{subscriptionNudgeMetrics.engagedUsers}</span>{' '}
                  users/followers ka momentum miss kar chuke ho. Agar subscription active hota to around{' '}
                  <span className="font-semibold text-slate-900">
                    {subscriptionNudgeMetrics.potentialExtraFollowers} followers
                  </span>{' '}
                  aur badh sakte the.
                </p>
                <div className="mt-3">
                  <Link
                    href="/dashboard/subscription"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <CreditCard className="h-4 w-4" />
                    Subscription Activate Karein
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
>>>>>>> origin/main
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Social links</p>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Connect your profiles</h2>
                <p className="mt-1 text-sm text-slate-500">Add social handles so customers can follow and contact you easily.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {socialPlatforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <label key={platform.key} className="grid gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {platform.label}
                    </span>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      value={socialLinks[platform.key]}
                      onChange={(event) => handleSocialLinkChange(platform.key, event.target.value)}
                      placeholder={platform.placeholder}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {socialLinksMessage ? <p className="text-sm text-slate-500">{socialLinksMessage}</p> : <span />}
              <button
                type="button"
                onClick={handleSaveSocialLinks}
                disabled={savingSocialLinks}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSocialLinks ? 'Saving…' : 'Save Social Links'}
              </button>
            </div>
          </div>

          {!hasProducts && (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-5 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                {myStore.businessType === 'service'
                  ? 'Add your first service'
                  : myStore.businessType === 'hybrid'
                    ? 'Add your first listing'
                    : 'Add your first product'}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Start building your storefront so customers can discover and contact you faster.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {(myStore.businessType === 'product' || myStore.businessType === 'hybrid') && (
                  <Link href="/dashboard/products" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Add Product
                  </Link>
                )}
                {(myStore.businessType === 'service' || myStore.businessType === 'hybrid') && (
                  <Link href="/dashboard/services" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Add Service
                  </Link>
                )}
              </div>
            </div>
          )}
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
    </div>
  );
}
