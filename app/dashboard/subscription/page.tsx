"use client";

import { useEffect, useState } from 'react';
import { Check, Crown, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { getSubscriptionPlans, getStoreSubscription, activateStoreSubscription, getStoredUser, getStoreBySlug } from '@/src/lib/api';
import type { SubscriptionPlan, StoreSubscription } from '@/types';

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

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<StoreSubscription | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const user = getStoredUser();
        const fetchedPlans = await getSubscriptionPlans();
        setPlans(fetchedPlans);

        if (!user?.storeSlug) {
          setError('No store found for this user');
          return;
        }

        const store = await getStoreBySlug(user.storeSlug);
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
    };
    init();
  }, []);

  const handleActivatePlan = async (plan: SubscriptionPlan) => {
    if (!storeId) return;
    if (activeSubscription && activeSubscription.plan.id === plan.id) {
      return;
    }

    setActivatingPlanId(plan.id);
    setSuccessMessage(null);
    setError(null);
    try {
      const subscription = await activateStoreSubscription(storeId, { planId: plan.id });
      setActiveSubscription(subscription);
      const messagePrefix = activeSubscription ? '🚀 Plan upgraded!' : '✅ Subscription activated!';
      setSuccessMessage(`${messagePrefix} You're now on the ${plan.name} plan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate subscription');
    } finally {
      setActivatingPlanId(null);
    }
  };

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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {activeSubscription && (
        <div className="bg-gradient-to-r from-purple-50 to-primary-50 border border-purple-200 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-xl font-semibold text-gray-900 capitalize">
                Current Plan: {activeSubscription.plan.name}
              </h2>
              <div className="flex items-center gap-2 text-sm md:text-base text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Active until {new Date(activeSubscription.endsAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>
              ₹{activeSubscription.price}/{formatPlanDuration(activeSubscription.plan.durationDays, activeSubscription.plan.billingCycle)}
            </p>
            <p className="mt-1">Max Products: {activeSubscription.plan.maxProducts >= 999999 ? 'Unlimited' : activeSubscription.plan.maxProducts}</p>
          </div>
        </div>
      )}

      {!activeSubscription && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6">
          <p className="text-blue-800 font-medium">You don't have an active subscription. Choose a plan below to get started!</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = activeSubscription?.plan.id === plan.id;
          const isActivating = activatingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden ${
                plan.isPopular ? 'ring-2 ring-primary' : ''
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
                  onClick={() => handleActivatePlan(plan)}
                  disabled={isCurrentPlan || isActivating || !plan.isActive}
                  className={`w-full py-2.5 md:py-3 rounded-lg transition font-semibold text-sm md:text-base flex items-center justify-center gap-2 ${
                    isCurrentPlan
                      ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                      : !plan.isActive
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                  ) : (
                    'Choose Plan'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeSubscription && (
        <div className="mt-6 md:mt-8 bg-white rounded-xl shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Subscription Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Plan Name</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{activeSubscription.plan.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Billing Cycle</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {formatPlanDuration(activeSubscription.plan.durationDays, activeSubscription.plan.billingCycle)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Started On</p>
              <p className="text-lg font-semibold text-gray-900">{new Date(activeSubscription.startsAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Expires On</p>
              <p className="text-lg font-semibold text-gray-900">{new Date(activeSubscription.endsAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                activeSubscription.status === 'active' ? 'bg-green-100 text-green-800' :
                activeSubscription.status === 'expired' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {activeSubscription.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Auto Renew</p>
              <p className="text-lg font-semibold text-gray-900">{activeSubscription.autoRenew ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
