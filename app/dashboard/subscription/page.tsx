"use client";

import { useCallback, useEffect, useState, useRef, type ComponentType, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Crown,
  Loader2,
  Calendar,
  AlertCircle,
  X,
  Info,
  Sparkles,
  QrCode,
  CreditCard,
  Building2,
} from 'lucide-react';
import {
  getSubscriptionPlans,
  getStoreSubscription,
  activateStoreSubscription,
  getStoredUser,
  getStoreBySlugFromApi,
  isApiError,
  getSubscriptionAddonPrices,
  saveStoreSubscriptionAddons,
} from '@/src/lib/api';
import type {
  SubscriptionPlan,
  StoreSubscription,
  SubscriptionAddonCharges,
  StoreSubscriptionAddons,
} from '@/types';
import {
  dispatchStoreProfileRefresh,
  STORE_PROFILE_REFRESH_EVENT,
} from '@/src/lib/storeSubscriptionAddons';

const formatPlanDuration = (durationDays?: number, billingCycle?: string) => {
  if (!durationDays || durationDays <= 0) {
    return billingCycle ?? 'cycle';
  }

  if (durationDays % 365 === 0) {
    const years = durationDays / 365;
    return years === 1 ? 'year' : `${years} years`;
  }

  if (durationDays % 30 === 0) {
    const months = durationDays / 30;
    return months === 1 ? 'month' : `${months} months`;
  }

  if (durationDays === 7) {
    return 'week';
  }

  return `${durationDays} days`;
};

/** Whole calendar days from local midnight today to the subscription end date (date part of `endsAt` ISO). */
const getCalendarDaysRemaining = (endsAtIso: string): number => {
  const end = new Date(endsAtIso);
  if (Number.isNaN(end.getTime())) return 0;
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
};

const remainingDaysText = (endsAtIso: string): string => {
  const d = getCalendarDaysRemaining(endsAtIso);
  if (d > 1) return `${d} days remaining`;
  if (d === 1) return '1 day remaining';
  if (d === 0) return 'Expires today';
  if (d === -1) return 'Expired (1 day ago)';
  return `Expired (${Math.abs(d)} days ago)`;
};

const remainingDaysClass = (endsAtIso: string): string => {
  const d = getCalendarDaysRemaining(endsAtIso);
  if (d < 0) return 'text-red-700';
  if (d <= 3) return 'text-amber-800';
  return 'text-gray-900';
};

const formatInr = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));

function AddonToggleRow({
  icon: Icon,
  title,
  hint,
  priceInr,
  checked,
  onToggle,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  priceInr: number;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 px-4 py-3.5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900/[0.06] text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600 leading-snug mt-0.5">{hint}</p>
        {priceInr > 0 && (
          <p className="text-xs font-semibold text-primary mt-1">+ ₹{formatInr(priceInr)}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-8 w-[3.25rem] shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
            checked ? 'translate-x-[1.35rem]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<StoreSubscription | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  /** Paid-plan / checkout messaging; does not replace the whole page (unlike fatal `error`). */
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  /** Plan chosen via “Choose plan” — checkout summary + add-on toggles. */
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [addonPrices, setAddonPrices] = useState<SubscriptionAddonCharges | null>(null);
  const [addonPricesLoading, setAddonPricesLoading] = useState(false);
  const [addonPayGateway, setAddonPayGateway] = useState(false);
  const [addonQr, setAddonQr] = useState(false);
  const [addonPgHelp, setAddonPgHelp] = useState(false);
  /** After live load of `subscription_addons` from API; toggles disabled until true to avoid races. */
  const [addonHydrated, setAddonHydrated] = useState(false);
  const [checkoutOpenSeq, setCheckoutOpenSeq] = useState(0);
  const [mounted, setMounted] = useState(false);
  const closeModalButtonRef = useRef<HTMLButtonElement>(null);
  const choosePlanCloseRef = useRef<HTMLButtonElement>(null);

  const openPlanModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const closePlanModal = () => {
    setSelectedPlan(null);
  };

  const openChoosePlanModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(null);
    setSubscriptionNotice(null);
    setActivationError(null);
    setAddonHydrated(false);
    setAddonPayGateway(false);
    setAddonQr(false);
    setAddonPgHelp(false);
    setAddonPrices(null);
    setCheckoutOpenSeq((n) => n + 1);
    setCheckoutPlan(plan);
  };

  const closeChoosePlanModal = () => {
    setCheckoutPlan(null);
    setAddonHydrated(false);
  };

  const handlePlanCardKeyDown = (e: KeyboardEvent, plan: SubscriptionPlan) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPlanModal(plan);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedPlan && !checkoutPlan) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (checkoutPlan) closeChoosePlanModal();
        else closePlanModal();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      if (checkoutPlan) choosePlanCloseRef.current?.focus();
      else closeModalButtonRef.current?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [selectedPlan, checkoutPlan]);

  useEffect(() => {
    if (!checkoutPlan) return;
    let cancelled = false;
    (async () => {
      setAddonPricesLoading(true);
      try {
        const p = await getSubscriptionAddonPrices();
        if (!cancelled) setAddonPrices(p);
      } catch {
        if (!cancelled) {
          setAddonPrices({
            payment_gateway_integration_inr: 0,
            qr_code_inr: 0,
            payment_gateway_help_inr: 0,
          });
        }
      } finally {
        if (!cancelled) setAddonPricesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutPlan]);

  useEffect(() => {
    if (!checkoutPlan) return;
    let cancelled = false;
    const slug = getStoredUser()?.storeSlug;
    if (!slug) {
      setAddonHydrated(true);
      return undefined;
    }
    setAddonHydrated(false);
    (async () => {
      try {
        const s = await getStoreBySlugFromApi(slug);
        if (cancelled) return;
        const a = s.subscriptionAddons;
        setAddonPayGateway(Boolean(a?.paymentGateway));
        setAddonQr(Boolean(a?.qrCode));
        setAddonPgHelp(Boolean(a?.paymentGatewayHelp));
      } catch {
        if (!cancelled) {
          setAddonPayGateway(false);
          setAddonQr(false);
          setAddonPgHelp(false);
        }
      } finally {
        if (!cancelled) setAddonHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutPlan, checkoutOpenSeq]);

  /** Save add-ons as soon as toggles change (after hydrate) so Payment settings appears in the sidebar without pressing Continue. */
  useEffect(() => {
    if (!checkoutPlan || !storeId || !addonHydrated) return undefined;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          await saveStoreSubscriptionAddons(storeId, {
            paymentGateway: addonPayGateway,
            qrCode: addonQr,
            paymentGatewayHelp: addonPgHelp,
          });
          dispatchStoreProfileRefresh();
        } catch (err) {
          setActivationError(
            err instanceof Error ? err.message : 'Could not save add-on selection. Run migrations if this is new.'
          );
        }
      })();
    }, 420);
    return () => window.clearTimeout(t);
  }, [addonPayGateway, addonQr, addonPgHelp, addonHydrated, checkoutPlan, storeId]);

  const loadSubscriptionPageData = useCallback(async () => {
    try {
      setLoading(true);
      const user = getStoredUser();
      const fetchedPlans = await getSubscriptionPlans();
      setPlans(fetchedPlans);

      if (!user?.storeSlug) {
        setError('No store found for this user');
        return;
      }

      // Laravel direct (not Next Redis) so new store + default free subscription are visible immediately.
      const store = await getStoreBySlugFromApi(user.storeSlug);
      if (!store) {
        setError('Store not found');
        return;
      }

      setStoreId(store.id);
      const { activeSubscription: activeSub } = await getStoreSubscription(store.id);
      setActiveSubscription(activeSub);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscriptionPageData();
  }, [loadSubscriptionPageData]);

  useEffect(() => {
    const onProfileRefresh = () => {
      void loadSubscriptionPageData();
    };
    window.addEventListener(STORE_PROFILE_REFRESH_EVENT, onProfileRefresh);
    return () => window.removeEventListener(STORE_PROFILE_REFRESH_EVENT, onProfileRefresh);
  }, [loadSubscriptionPageData]);

  const checkoutAddonPayload = (): StoreSubscriptionAddons => ({
    paymentGateway: addonPayGateway,
    qrCode: addonQr,
    paymentGatewayHelp: addonPgHelp,
  });

  const handleActivatePlan = async (plan: SubscriptionPlan, addons?: StoreSubscriptionAddons) => {
    if (!storeId) return;
    if (activeSubscription && activeSubscription.plan.id === plan.id) {
      return;
    }

    const planPrice = Number(plan.price);
    if (planPrice > 0) {
      setCheckoutPlan(null);
      setSubscriptionNotice(
        'This is a paid plan. Your current subscription stays the same until checkout and payment are completed. (Payment step is not connected yet.)'
      );
      setActivationError(null);
      setSuccessMessage(null);
      return;
    }

    setActivatingPlanId(plan.id);
    setSuccessMessage(null);
    setSubscriptionNotice(null);
    setActivationError(null);
    setError(null);
    try {
      const subscription = await activateStoreSubscription(storeId, {
        planId: plan.id,
        addons: addons ?? { paymentGateway: false, qrCode: false, paymentGatewayHelp: false },
      });
      setActiveSubscription(subscription);
      setSelectedPlan((p) => (p?.id === plan.id ? null : p));
      setCheckoutPlan(null);
      dispatchStoreProfileRefresh();
      const messagePrefix = activeSubscription ? '🚀 Plan upgraded!' : '✅ Subscription activated!';
      setSuccessMessage(`${messagePrefix} You're now on the ${plan.name} plan.`);
    } catch (err) {
      if (isApiError(err) && err.status === 402) {
        setSubscriptionNotice(
          err.message ||
            'Paid plans require checkout. Your active subscription will not change until payment succeeds.'
        );
      } else if (isApiError(err) && err.status === 409) {
        setSubscriptionNotice(err.message || 'This change is not allowed for your current subscription.');
      } else {
        setActivationError(err instanceof Error ? err.message : 'Failed to activate subscription');
      }
    } finally {
      setActivatingPlanId(null);
    }
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutPlan || !storeId) return;
    const plan = checkoutPlan;
    const addons = checkoutAddonPayload();

    if (Number(plan.price) > 0) {
      setActivatingPlanId(plan.id);
      setActivationError(null);
      try {
        await saveStoreSubscriptionAddons(storeId, addons);
        dispatchStoreProfileRefresh();
        setSubscriptionNotice(
          addons.paymentGateway || addons.qrCode || addons.paymentGatewayHelp
            ? 'Selections saved. Open Payment settings from the sidebar to continue setup when checkout is available. Your active plan stays the same until payment succeeds.'
            : 'Paid checkout is not connected yet. Your active plan will not change until payment succeeds.'
        );
        setCheckoutPlan(null);
      } catch (err) {
        setActivationError(
          err instanceof Error ? err.message : 'Could not save add-on selections. If this persists, run database migrations.'
        );
      } finally {
        setActivatingPlanId(null);
      }
      return;
    }

    await handleActivatePlan(plan, addons);
  };

  const addonSum =
    addonPrices != null
      ? (addonPayGateway ? addonPrices.payment_gateway_integration_inr : 0) +
        (addonQr ? addonPrices.qr_code_inr : 0) +
        (addonPgHelp ? addonPrices.payment_gateway_help_inr : 0)
      : 0;
  const checkoutBase = checkoutPlan ? Number(checkoutPlan.price) : 0;
  const checkoutTotal = checkoutBase + addonSum;

  /** Paid subscription period is running — cannot switch to any other plan until it ends (free plan can be upgraded). */
  const planChangeLockedByPaidPeriod =
    activeSubscription != null &&
    activeSubscription.status === 'active' &&
    Number(activeSubscription.plan.price) > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Subscription</h1>
        <p className="text-sm md:text-base text-gray-600">Manage your subscription plan</p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium">
          {successMessage}
        </div>
      )}

      {subscriptionNotice && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm md:text-base">
          {subscriptionNotice}
        </div>
      )}

      {activationError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm md:text-base">
          {activationError}
        </div>
      )}

      {planChangeLockedByPaidPeriod && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 text-sm text-indigo-950 md:text-base">
          <p className="font-semibold">Plan changes are locked for your current billing period</p>
          <p className="mt-1 text-indigo-900/90">
            You are on a paid plan until{' '}
            <span className="font-medium">{new Date(activeSubscription!.endsAt).toLocaleDateString()}</span>. You can
            pick a different plan after it ends. On a free plan you can upgrade anytime.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {activeSubscription && (
        <div className="bg-gradient-to-r from-purple-50 to-primary-50 border border-purple-200 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base md:text-xl font-semibold text-gray-900 capitalize">
                  Current Plan: {activeSubscription.plan.name}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-sm md:text-base text-gray-600">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Active until {new Date(activeSubscription.endsAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <span
              className={`self-start sm:self-center inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                activeSubscription.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : activeSubscription.status === 'expired'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {activeSubscription.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-4 border-t border-purple-200/80">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-0.5">Plan name</p>
              <p className="text-base font-semibold text-gray-900 capitalize">{activeSubscription.plan.name}</p>
              <p className="text-xs text-gray-500 mt-1">Ref: {activeSubscription.plan.slug}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-0.5">Billing cycle</p>
              <p className="text-base font-semibold text-gray-900 capitalize">
                {formatPlanDuration(activeSubscription.plan.durationDays, activeSubscription.plan.billingCycle)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-0.5">Started on</p>
              <p className="text-base font-semibold text-gray-900">
                {new Date(activeSubscription.startsAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-0.5">Expires on</p>
              <p className="text-base font-semibold text-gray-900">
                {new Date(activeSubscription.endsAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-0.5">Remaining days</p>
              <p className={`text-base font-semibold ${remainingDaysClass(activeSubscription.endsAt)}`}>
                {remainingDaysText(activeSubscription.endsAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-0.5">Price & limit</p>
              <p className="text-base font-semibold text-gray-900">
                ₹{activeSubscription.price} /{' '}
                {formatPlanDuration(activeSubscription.plan.durationDays, activeSubscription.plan.billingCycle)}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                Max products:{' '}
                {activeSubscription.plan.maxProducts >= 999999 ? 'Unlimited' : activeSubscription.plan.maxProducts}
              </p>
            </div>
          </div>

          {activeSubscription.plan.features.length > 0 && (
            <div className="mt-5 pt-5 border-t border-purple-200/80">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Features included with your plan</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                {activeSubscription.plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 rounded-lg bg-white/60 border border-purple-100/80 px-3 py-2 text-sm text-gray-800"
                  >
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!activeSubscription && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6">
          <p className="text-blue-800 font-medium">You don't have an active subscription. Choose a plan below to get started!</p>
        </div>
      )}

      <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
        <Info className="w-4 h-4 text-primary flex-shrink-0" />
        {planChangeLockedByPaidPeriod
          ? 'Your paid subscription is fixed until the end date above. You can still open other plans to compare (preview only).'
          : activeSubscription
            ? 'Your active plan is summarized above. Click another plan card for a preview, or use Choose Plan to review add-ons and totals before confirming.'
            : 'Click a plan card for a quick preview, or use Choose Plan to open checkout with optional add-ons.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = activeSubscription?.plan.id === plan.id;
          const isActivating = activatingPlanId === plan.id;
          const isModalPlan = selectedPlan?.id === plan.id;
          const canOpenDetailsModal = !isCurrentPlan;

          return (
            <div
              key={plan.id}
              role={canOpenDetailsModal ? 'button' : undefined}
              tabIndex={canOpenDetailsModal ? 0 : undefined}
              aria-haspopup={canOpenDetailsModal ? 'dialog' : undefined}
              aria-expanded={canOpenDetailsModal ? isModalPlan : undefined}
              aria-label={
                canOpenDetailsModal
                  ? `${plan.name} plan, ₹${plan.price}. Open details`
                  : `${plan.name} — your current plan (details above)`
              }
              onClick={() => {
                if (canOpenDetailsModal) openPlanModal(plan);
              }}
              onKeyDown={(e) => {
                if (canOpenDetailsModal) handlePlanCardKeyDown(e, plan);
              }}
              className={`bg-white rounded-xl shadow-md transition overflow-hidden text-left ${
                canOpenDetailsModal
                  ? 'cursor-pointer hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                  : 'cursor-default ring-2 ring-purple-200/80'
              } ${plan.isPopular && !isCurrentPlan ? 'ring-2 ring-primary' : ''} ${
                isModalPlan ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="bg-primary text-white text-center py-2 text-xs md:text-sm font-semibold">
                  MOST POPULAR
                </div>
              )}
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 capitalize">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl md:text-4xl font-bold text-gray-900">₹{plan.price}</span>
                  <span className="text-sm md:text-base text-gray-600">/{formatPlanDuration(plan.durationDays, plan.billingCycle)}</span>
                </div>

                <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs md:text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (planChangeLockedByPaidPeriod && !isCurrentPlan) return;
                    openChoosePlanModal(plan);
                  }}
                  disabled={isCurrentPlan || isActivating || !plan.isActive || (planChangeLockedByPaidPeriod && !isCurrentPlan)}
                  className={`w-full py-2.5 md:py-3 rounded-lg transition font-semibold text-sm md:text-base flex items-center justify-center gap-2 ${
                    isCurrentPlan
                      ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                      : !plan.isActive
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : planChangeLockedByPaidPeriod && !isCurrentPlan
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-700'
                  }`}
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Activating...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : !plan.isActive ? (
                    'Unavailable'
                  ) : planChangeLockedByPaidPeriod ? (
                    'Locked until renewal'
                  ) : (
                    'Choose Plan'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {mounted &&
        selectedPlan &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
              aria-label="Close dialog"
              onClick={closePlanModal}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="plan-modal-title"
              className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-lg flex-col rounded-t-3xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-900/20 sm:rounded-3xl"
            >
              <div className="relative shrink-0 overflow-hidden rounded-t-3xl bg-gradient-to-br from-violet-600 via-primary to-indigo-700 px-6 pb-10 pt-8 text-white sm:rounded-t-3xl">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-white/80">Plan details</p>
                      <h2 id="plan-modal-title" className="mt-1 text-2xl font-bold capitalize leading-tight tracking-tight">
                        {selectedPlan.name}
                      </h2>
                      <p className="mt-1 truncate text-sm text-white/75">Ref: {selectedPlan.slug}</p>
                    </div>
                  </div>
                  <button
                    ref={closeModalButtonRef}
                    type="button"
                    onClick={closePlanModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative mt-6 flex flex-wrap items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight">₹{selectedPlan.price}</span>
                  <span className="pb-1 text-base text-white/85">
                    / {formatPlanDuration(selectedPlan.durationDays, selectedPlan.billingCycle)}
                  </span>
                </div>
              </div>

              <div className="-mt-4 flex-1 overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-5 pb-6 pt-5 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.isPopular && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      Most popular
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selectedPlan.isActive !== false ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {selectedPlan.isActive !== false ? 'Available' : 'Unavailable'}
                  </span>
                  {activeSubscription?.plan.id === selectedPlan.id && (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                      Your current plan
                    </span>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Limits</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    Max products:{' '}
                    {selectedPlan.maxProducts >= 999999 ? 'Unlimited' : selectedPlan.maxProducts}
                  </p>
                </div>

                {selectedPlan.description && (
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {selectedPlan.description}
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">All features</h3>
                  <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {selectedPlan.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closePlanModal}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 sm:w-auto sm:px-5"
                  >
                    Close
                  </button>
                  {selectedPlan.isActive !== false &&
                    activeSubscription?.plan.id !== selectedPlan.id &&
                    storeId &&
                    !planChangeLockedByPaidPeriod && (
                    <button
                      type="button"
                      onClick={() => openChoosePlanModal(selectedPlan)}
                      className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-700 sm:w-auto sm:px-6"
                    >
                      Choose this plan
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        checkoutPlan &&
        createPortal(
          <div
            className="fixed inset-0 z-[101] flex items-end justify-center sm:items-center sm:p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-label="Close dialog"
              onClick={closeChoosePlanModal}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="checkout-plan-title"
              className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 sm:rounded-3xl"
            >
              <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-primary px-5 pb-8 pt-6 text-white sm:px-6 sm:pt-7">
                <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Checkout</p>
                    <h2 id="checkout-plan-title" className="mt-1 text-2xl font-bold capitalize tracking-tight">
                      {checkoutPlan.name}
                    </h2>
                    <p className="mt-1 text-sm text-white/80">
                      Review your plan, optional add-ons from admin pricing, and total before confirming.
                    </p>
                  </div>
                  <button
                    ref={choosePlanCloseRef}
                    type="button"
                    onClick={closeChoosePlanModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative mt-5 flex flex-wrap items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight">₹{formatInr(Number(checkoutPlan.price))}</span>
                  <span className="pb-1.5 text-sm text-white/85">
                    base / {formatPlanDuration(checkoutPlan.durationDays, checkoutPlan.billingCycle)}
                  </span>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
                  {checkoutPlan.description ? (
                    <p className="text-sm leading-relaxed text-slate-600">{checkoutPlan.description}</p>
                  ) : null}

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan features</p>
                    <ul className="mt-2 grid max-h-40 grid-cols-1 gap-2 overflow-y-auto sm:max-h-48">
                      {checkoutPlan.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-700"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Optional add-ons</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {addonPricesLoading && (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading prices…
                          </span>
                        )}
                        {!addonHydrated && !addonPricesLoading && (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Syncing saved selections…
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <AddonToggleRow
                        icon={CreditCard}
                        title="Payment gateway integration"
                        hint="We help connect a payment gateway to your store."
                        priceInr={addonPrices?.payment_gateway_integration_inr ?? 0}
                        checked={addonPayGateway}
                        onToggle={() => setAddonPayGateway((v) => !v)}
                        disabled={addonPricesLoading || !addonHydrated}
                      />
                      <AddonToggleRow
                        icon={QrCode}
                        title="QR code"
                        hint="QR-based payment display for your storefront."
                        priceInr={addonPrices?.qr_code_inr ?? 0}
                        checked={addonQr}
                        onToggle={() => setAddonQr((v) => !v)}
                        disabled={addonPricesLoading || !addonHydrated}
                      />
                      <AddonToggleRow
                        icon={Building2}
                        title="Payment gateway — company help"
                        hint="Our team handles gateway setup on your behalf."
                        priceInr={addonPrices?.payment_gateway_help_inr ?? 0}
                        checked={addonPgHelp}
                        onToggle={() => setAddonPgHelp((v) => !v)}
                        disabled={addonPricesLoading || !addonHydrated}
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-5 py-4 sm:px-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Plan</span>
                      <span className="font-medium text-slate-900">₹{formatInr(checkoutBase)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Add-ons (selected)</span>
                      <span className="font-medium text-slate-900">₹{formatInr(addonSum)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/80 pt-2 text-base font-bold text-slate-900">
                      <span>Estimated total</span>
                      <span>₹{formatInr(checkoutTotal)}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">
                    {Number(checkoutPlan.price) > 0
                      ? 'Final amount will be confirmed at payment. Your subscription does not change until checkout succeeds.'
                      : 'Free plan: add-ons are shown for future billing; only the plan is activated today.'}
                  </p>
                  <div className="mt-4 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                      type="button"
                      onClick={closeChoosePlanModal}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:px-5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmCheckout()}
                      disabled={activatingPlanId === checkoutPlan.id || !storeId}
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-primary py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition hover:opacity-95 disabled:opacity-60 sm:w-auto sm:px-6"
                    >
                      {activatingPlanId === checkoutPlan.id ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Working…
                        </span>
                      ) : Number(checkoutPlan.price) > 0 ? (
                        'Continue to payment'
                      ) : (
                        'Confirm & activate'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
