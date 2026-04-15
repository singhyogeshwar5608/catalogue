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
  getSubscriptionPlanCatalog,
  getStoreSubscription,
  activateStoreSubscription,
  getStoredUser,
  getStoreBySlugFromApi,
  isApiError,
  getSubscriptionAddonPrices,
  saveStoreSubscriptionAddons,
  createStoreSubscriptionRazorpayOrder,
  verifyStoreSubscriptionRazorpayPayment,
  completeStoreSubscriptionMockPayment,
} from '@/src/lib/api';
import type {
  SubscriptionPlan,
  StoreSubscription,
  SubscriptionAddonCharges,
  StoreSubscriptionAddons,
} from '@/types';
import { dispatchStoreProfileRefresh } from '@/src/lib/storeSubscriptionAddons';
import { loadRazorpayCheckoutScript } from '@/src/lib/razorpayCheckoutScript';

/**
 * Mock checkout button is shown in all environments unless explicitly hidden.
 * Hide everywhere: `NEXT_PUBLIC_SUBSCRIPTION_MOCK_PAYMENT=false` at build time.
 * Lock API to real payments only: `SUBSCRIPTION_MOCK_PAYMENT=false` in Laravel `backend/.env`.
 */
const SUBSCRIPTION_MOCK_PAYMENT_UI =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUBSCRIPTION_MOCK_PAYMENT !== 'false';

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

/** Hide free-trial marketing lines when the store is on a paid subscription period. */
const TRIAL_FEATURE_LINE = /\btrial\b|free\s*trial|\d+\s*days?\s*trial/i;

const featuresWithoutTrialHints = (features: string[]): string[] =>
  features.filter((line) => !TRIAL_FEATURE_LINE.test(line));

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
    <div className="flex items-center gap-2 px-0 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 pr-1">
        <p className="truncate text-[12px] font-semibold leading-tight text-slate-900">{title}</p>
        {priceInr > 0 && (
          <p className="mt-0.5 text-[12px] font-semibold leading-tight text-primary">+ ₹{formatInr(priceInr)}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
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
  /** Paid checkout: prompt to enable payment gateway if user skipped it on the card. */
  const [paymentGatewaySuggestOpen, setPaymentGatewaySuggestOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeModalButtonRef = useRef<HTMLButtonElement>(null);
  const paymentGatewayPromptCloseRef = useRef<HTMLButtonElement>(null);
  /** Prevents Mock + Razorpay flows from running together if clicks fire close together. */
  const subscriptionCheckoutLockRef = useRef(false);

  const openPlanModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const closePlanModal = () => {
    setSelectedPlan(null);
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
    if (!selectedPlan) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closePlanModal();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => {
      closeModalButtonRef.current?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [selectedPlan]);

  useEffect(() => {
    if (!checkoutPlan) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (paymentGatewaySuggestOpen) setPaymentGatewaySuggestOpen(false);
        else setCheckoutPlan(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [checkoutPlan, paymentGatewaySuggestOpen]);

  useEffect(() => {
    if (!paymentGatewaySuggestOpen) return;
    const t = window.setTimeout(() => paymentGatewayPromptCloseRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [paymentGatewaySuggestOpen]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
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
  }, [storeId]);

  /** Save add-ons as soon as toggles change (after hydrate); Payment settings nav still requires an active paid period. */
  const checkoutPlanId = checkoutPlan?.id;
  useEffect(() => {
    if (!checkoutPlanId || !storeId || !addonHydrated) return undefined;
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
  }, [addonPayGateway, addonQr, addonPgHelp, addonHydrated, checkoutPlanId, storeId]);

  const loadSubscriptionPageData = useCallback(async () => {
    try {
      setLoading(true);
      const user = getStoredUser();
      const fetchedPlans = await getSubscriptionPlanCatalog();
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

  const proceedPaidPlanCheckout = async (planOverride?: SubscriptionPlan) => {
    const plan = planOverride ?? checkoutPlan;
    if (!plan || !storeId) return;
    if (subscriptionCheckoutLockRef.current) return;
    subscriptionCheckoutLockRef.current = true;
    const addons = checkoutAddonPayload();
    setActivatingPlanId(plan.id);
    setActivationError(null);
    setSuccessMessage(null);
    try {
      await saveStoreSubscriptionAddons(storeId, addons);
      dispatchStoreProfileRefresh();

      const order = await createStoreSubscriptionRazorpayOrder(storeId, { planId: plan.id, addons });
      await loadRazorpayCheckoutScript();

      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        throw new Error('Razorpay checkout is unavailable. Refresh the page and try again.');
      }

      const user = getStoredUser();

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        const rzp = new RazorpayCtor({
          key: order.keyId,
          order_id: order.orderId,
          currency: order.currency,
          name: 'Subscription',
          description: order.planName ? `${order.planName} plan` : 'Plan checkout',
          handler: (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            void (async () => {
              try {
                const subscription = await verifyStoreSubscriptionRazorpayPayment(storeId, {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                setActiveSubscription(subscription);
                setSubscriptionNotice(null);
                setPaymentGatewaySuggestOpen(false);
                setCheckoutPlan(null);
                dispatchStoreProfileRefresh();
                setSuccessMessage(`✅ Payment successful! You are now on the ${subscription.plan.name} plan.`);
              } catch (verifyErr) {
                setActivationError(
                  verifyErr instanceof Error
                    ? verifyErr.message
                    : 'Payment received but activation failed. Contact support with your Razorpay payment ID.'
                );
              } finally {
                setActivatingPlanId(null);
                finish();
              }
            })();
          },
          modal: {
            ondismiss: () => {
              setActivatingPlanId(null);
              finish();
            },
          },
          prefill: {
            email: user?.email ?? undefined,
            name: user?.name ?? undefined,
          },
          theme: { color: '#d97706' },
        });

        rzp.on('payment.failed', (res) => {
          const msg = res?.error?.description ?? 'Payment failed.';
          setActivationError(msg);
          setActivatingPlanId(null);
          finish();
        });

        rzp.open();
      });
    } catch (err) {
      setActivationError(
        err instanceof Error
          ? err.message
          : 'Could not start checkout. If Razorpay keys are missing, add them to the Laravel backend `.env` file.'
      );
      setActivatingPlanId(null);
    } finally {
      subscriptionCheckoutLockRef.current = false;
    }
  };

  /** Same end state as successful Razorpay verify; for local/testing when mock is enabled on the API. */
  const proceedMockPaidPlanCheckout = async (planOverride?: SubscriptionPlan) => {
    const plan = planOverride ?? checkoutPlan;
    if (!plan || !storeId) return;
    if (subscriptionCheckoutLockRef.current) return;
    subscriptionCheckoutLockRef.current = true;
    const addons = checkoutAddonPayload();
    setActivatingPlanId(plan.id);
    setActivationError(null);
    setSuccessMessage(null);
    try {
      await saveStoreSubscriptionAddons(storeId, addons);
      const subscription = await completeStoreSubscriptionMockPayment(storeId, {
        planId: plan.id,
        addons,
      });
      setActiveSubscription(subscription);
      setSubscriptionNotice(null);
      setPaymentGatewaySuggestOpen(false);
      setCheckoutPlan(null);
      setSuccessMessage(`✅ Mock payment successful! You are now on the ${subscription.plan.name} plan.`);
    } catch (err) {
      setActivationError(
        isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Mock activation failed. On the API: ensure mock is allowed (default on; set SUBSCRIPTION_MOCK_PAYMENT=false only to disable), then `php artisan config:clear` if needed.',
      );
    } finally {
      setActivatingPlanId(null);
      subscriptionCheckoutLockRef.current = false;
    }
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
        <div className="bg-gradient-to-r from-purple-50 to-primary-50 border border-purple-200 rounded-xl p-4 md:p-6 mb-6" id="current-subscription">
          <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-3 pr-16 sm:pr-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-semibold capitalize text-gray-900 sm:text-base md:text-xl">
                  Current Plan: {activeSubscription.plan.name}
                </h2>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-600 sm:mt-1 sm:gap-2 sm:text-sm md:text-base">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Active until {new Date(activeSubscription.endsAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <span
              className={`absolute right-0 top-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:static sm:self-center sm:px-3 sm:py-1 sm:text-sm ${
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

          <div className="grid grid-cols-1 gap-1.5 border-t border-purple-200/80 pt-3 sm:grid-cols-2 sm:gap-3 md:gap-4">
            <div className="flex items-start justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">Plan name</p>
              <div className="text-right sm:text-left">
                <p className="text-[11px] font-semibold capitalize text-gray-900 sm:text-base">{activeSubscription.plan.name}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">Billing cycle</p>
              <p className="text-right text-[11px] font-semibold capitalize text-gray-900 sm:text-left sm:text-base">
                {formatPlanDuration(activeSubscription.plan.durationDays, activeSubscription.plan.billingCycle)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">Started on</p>
              <p className="text-right text-[11px] font-semibold text-gray-900 sm:text-left sm:text-base">
                {new Date(activeSubscription.startsAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">Expires on</p>
              <p className="text-right text-[11px] font-semibold text-gray-900 sm:text-left sm:text-base">
                {new Date(activeSubscription.endsAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">Remaining days</p>
              <p className={`text-right text-[11px] font-semibold sm:text-left sm:text-base ${remainingDaysClass(activeSubscription.endsAt)}`}>
                {remainingDaysText(activeSubscription.endsAt)}
              </p>
            </div>
          </div>

        </div>
      )}

      {!activeSubscription && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6">
          <p className="text-blue-800 font-medium">
            You don&apos;t have an active subscription. Choose a plan below to get started!
          </p>
        </div>
      )}

      {plans.length > 0 && (
        <section
          className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6"
          aria-labelledby="subscription-plan-catalog-heading"
        >
          <div className="mb-5 hidden min-w-0 border-b border-gray-100 pb-4 md:block">
            <h2
              id="subscription-plan-catalog-heading"
              className="text-lg font-semibold text-gray-900 md:text-xl"
            >
              All subscription plans
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Full catalog from your administrator (including inactive plans for reference). Checkout is only offered
              on plans marked available.
            </p>
            {planChangeLockedByPaidPeriod ? (
              <p className="mt-3 text-sm font-medium leading-snug text-indigo-950">
                You have an active paid subscription — you can compare plans below, but you cannot switch or start
                another plan until the current period ends.
              </p>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-gray-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {activeSubscription
                  ? 'Your active plan is summarized above. Open a card for details, or use Choose plan on an available plan to review add-ons and checkout.'
                  : 'Open a card for details, or use Choose plan to expand checkout options on that plan.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrentPlan = activeSubscription?.plan.id === plan.id;
          const isActivating = activatingPlanId === plan.id;
          const isModalPlan = selectedPlan?.id === plan.id;
          const canOpenDetailsModal = false;
          const showInlineAddons = !isCurrentPlan && plan.isActive;
          const displayPrice = formatInr(Number(plan.price) + addonSum);

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
              className={`overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition md:rounded-xl md:shadow-md ${
                canOpenDetailsModal
                  ? 'cursor-pointer hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                  : 'cursor-default ring-2 ring-purple-200/80'
              } ${plan.isPopular && !isCurrentPlan ? 'ring-2 ring-primary' : ''} ${
                isModalPlan ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="bg-gradient-to-r from-primary to-indigo-600 py-2 text-center text-[10px] font-semibold tracking-wide text-white md:text-sm">
                  MOST POPULAR
                </div>
              )}
              <div className="p-3 md:p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {!plan.isActive ? (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200/80">
                      Inactive
                    </span>
                  ) : null}
                  {isCurrentPlan ? (
                    <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200/80">
                      Your plan
                    </span>
                  ) : null}
                </div>
                <h3 className="mb-1 text-base font-bold capitalize tracking-tight text-slate-900 md:text-xl">{plan.name}</h3>
                <div className="mb-3 flex items-end gap-1.5 md:mb-4">
                  <span className="text-3xl font-bold leading-none text-slate-900 md:text-4xl">₹{displayPrice}</span>
                  <span className="pb-0.5 text-[11px] text-slate-600 md:text-base">/{formatPlanDuration(plan.durationDays, plan.billingCycle)}</span>
                </div>
                {showInlineAddons ? (
                  <p className="mb-3 text-[10px] font-medium text-slate-500 md:text-xs">
                    Base: ₹{formatInr(Number(plan.price))} + Add-ons: ₹{formatInr(addonSum)}
                  </p>
                ) : null}

                <ul className="mb-4 space-y-1.5 p-0 md:mb-6 md:space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-1.5 px-0 py-0.5 md:gap-2 md:py-0">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500 md:h-5 md:w-5" />
                      <span className="text-[10px] font-semibold leading-snug text-slate-700 md:text-sm md:font-normal">{feature}</span>
                    </li>
                  ))}
                </ul>

                {showInlineAddons ? (
                  <div
                    className="mb-4 p-0"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Optional add-ons</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        {addonPricesLoading && (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading…
                          </span>
                        )}
                        {!addonHydrated && !addonPricesLoading && (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Syncing…
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
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
                ) : null}

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (planChangeLockedByPaidPeriod && !isCurrentPlan) return;
                    setCheckoutPlan(plan);
                    setSubscriptionNotice(null);
                    setActivationError(null);
                    setSuccessMessage(null);
                    if (Number(plan.price) > 0) {
                      await proceedPaidPlanCheckout(plan);
                    } else {
                      await handleActivatePlan(plan, checkoutAddonPayload());
                    }
                  }}
                  disabled={isCurrentPlan || isActivating || !plan.isActive || (planChangeLockedByPaidPeriod && !isCurrentPlan)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[15px] font-semibold transition md:rounded-lg md:py-3 md:text-base ${
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
                    `Choose Plan • ₹${displayPrice}`
                  )}
                </button>
              </div>
            </div>
          );
        })}
          </div>
        </section>
      )}

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
                    {(selectedPlan.id === activeSubscription?.plan.id && Number(activeSubscription?.plan.price ?? 0) > 0
                      ? featuresWithoutTrialHints(selectedPlan.features)
                      : selectedPlan.features
                    ).map((feature, index) => (
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
                      onClick={async () => {
                        setCheckoutPlan(selectedPlan);
                        setSubscriptionNotice(null);
                        setActivationError(null);
                        setSuccessMessage(null);
                        if (Number(selectedPlan.price) > 0) {
                          await proceedPaidPlanCheckout(selectedPlan);
                        } else {
                          await handleActivatePlan(selectedPlan, checkoutAddonPayload());
                        }
                      }}
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
        paymentGatewaySuggestOpen &&
        checkoutPlan &&
        Number(checkoutPlan.price) > 0 &&
        createPortal(
          <div
            className="fixed inset-0 z-[102] flex items-end justify-center p-4 sm:items-center"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              aria-label="Close dialog"
              onClick={() => setPaymentGatewaySuggestOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pg-suggest-title"
              aria-describedby="pg-suggest-desc"
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-amber-200/90 bg-white shadow-2xl ring-1 ring-amber-900/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50/40 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 text-amber-950">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200/80">
                    <Info className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide">Heads-up</p>
                </div>
              </div>
              <div className="border-l-4 border-amber-400 px-5 pb-4 pt-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/80">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 id="pg-suggest-title" className="text-lg font-bold text-slate-900">
                        Payment gateway
                      </h2>
                      <p id="pg-suggest-desc" className="mt-2 text-sm leading-relaxed text-slate-600">
                        Choose payment gateway integration for a better experience when you take payments.
                      </p>
                      <p className="mt-2 text-xs font-medium text-amber-900/90">
                        This add-on is optional — you can turn it on or continue without it.
                      </p>
                    </div>
                  </div>
                  <button
                    ref={paymentGatewayPromptCloseRef}
                    type="button"
                    onClick={() => setPaymentGatewaySuggestOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-white text-slate-600 transition hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="bg-amber-50/25 px-5 py-4 sm:px-6">
                <AddonToggleRow
                  icon={CreditCard}
                  title="Payment gateway integration"
                  hint="We help connect a payment gateway to your store."
                  priceInr={addonPrices?.payment_gateway_integration_inr ?? 0}
                  checked={addonPayGateway}
                  onToggle={() => setAddonPayGateway((v) => !v)}
                  disabled={addonPricesLoading || !addonHydrated}
                />
                {!addonHydrated && (
                  <p className="mt-2 text-xs text-slate-500">Loading your saved selections…</p>
                )}
              </div>
              <div className="relative z-10 flex flex-col gap-2 border-t border-amber-100 bg-amber-50/40 px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPaymentGatewaySuggestOpen(false);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:px-5"
                >
                  Go back
                </button>
                {SUBSCRIPTION_MOCK_PAYMENT_UI ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void proceedMockPaidPlanCheckout();
                    }}
                    disabled={
                      activatingPlanId === checkoutPlan.id || !storeId || addonPricesLoading || !addonHydrated
                    }
                    className="relative z-[1] w-full rounded-xl border border-amber-400 bg-amber-100/80 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-5"
                    title="Skips Razorpay; same subscription activation when the API allows mock checkout."
                  >
                    {activatingPlanId === checkoutPlan.id ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Working…
                      </span>
                    ) : (
                      'Mock payment (test)'
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void proceedPaidPlanCheckout();
                  }}
                  disabled={activatingPlanId === checkoutPlan.id || !storeId || addonPricesLoading || !addonHydrated}
                  className="relative z-[1] w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
                >
                  {activatingPlanId === checkoutPlan.id ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Working…
                    </span>
                  ) : (
                    'Continue to payment'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
}
