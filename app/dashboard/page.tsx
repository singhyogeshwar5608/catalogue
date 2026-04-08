"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
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
  X,
  Youtube,
  Zap,
} from 'lucide-react';
import { getStoreBySlug, getStoreSubscription, isApiError, updateStore } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import type { Product, Store, StoreSubscription } from '@/types';
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
      const { store, products } = await getStoreBySlug(user.storeSlug);
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
          const endsAt = new Date(subData.activeSubscription.endsAt);
          const remainingDays = Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          if (remainingDays <= 7) {
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

  const stats = useMemo(() => {
    if (!myStore) return [];

    return [
      {
        label: myStore.businessType === 'service' ? 'Services' : myStore.businessType === 'hybrid' ? 'Listings' : 'Products',
        value: String(myProducts.length),
        icon: myStore.businessType === 'service' ? Briefcase : Package,
      },
      {
        label: 'Reviews',
        value: String(myStore.totalReviews),
        icon: Users,
      },
      {
        label: 'Rating',
        value: `${myStore.rating}/5`,
        icon: Star,
      },
      {
        label: 'Plan',
        value: subscription ? subscription.plan.name : 'Free',
        icon: CreditCard,
      },
    ];
  }, [myProducts.length, myStore, subscription]);

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
      const { store } = await updateStore({
        id: myStore.id,
        facebook_url: socialLinks.facebook.trim() || null,
        instagram_url: socialLinks.instagram.trim() || null,
        youtube_url: socialLinks.youtube.trim() || null,
        linkedin_url: socialLinks.linkedin.trim() || null,
      });
      setMyStore(store);
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

  const subscriptionDaysRemaining = daysUntil(subscription?.endsAt);
  const boostDaysRemaining = daysUntil(myStore?.activeBoost?.endsAt);

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
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
                  <img src={myStore.logo} alt={myStore.name} className="h-full w-full object-cover" />
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

      <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm sm:rounded-[24px]">
        <table className="w-full text-left text-sm">
          <tbody>
            {stats.map((stat, index) => (
              <tr
                key={stat.label}
                className={`border-slate-200 ${index !== stats.length - 1 ? 'border-b' : ''}`}
              >
                <th scope="row" className="w-1/2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:w-1/3 sm:px-5 sm:py-4">
                  {stat.label}
                </th>
                <td className="px-4 py-3 text-base font-semibold text-slate-900 sm:px-5 sm:py-4 sm:text-lg">
                  {stat.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                      type="url"
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
          daysRemaining={subscriptionDaysRemaining ?? 0}
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
