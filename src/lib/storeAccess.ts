import type { Store, StoreSubscription } from '@/types';
import { trialEndsAtFallbackFromCreated } from '@/src/lib/freeTrialDays';

export function isPaidSubscriptionActive(sub: StoreSubscription | null | undefined): boolean {
  if (!sub || sub.status !== 'active') return false;
  const end = new Date(sub.endsAt).getTime();
  return !Number.isNaN(end) && end > Date.now();
}

function effectiveTrialEndMs(store: Store): number | null {
  const direct = store.trialEndsAt;
  if (direct) {
    const t = new Date(direct).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (store.createdAt) {
    const fb = trialEndsAtFallbackFromCreated(store.createdAt);
    if (fb) {
      const t = new Date(fb).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  return null;
}

/**
 * True when the store's trial has ended and there is no currently active paid subscription.
 * Used to lock public storefront / product / service pages (including when the owner is logged in).
 */
export function isStoreTrialExpiredWithoutPaidPlan(store: Store | null | undefined): boolean {
  if (!store) return false;
  if (isPaidSubscriptionActive(store.activeSubscription)) return false;
  const trialEnd = effectiveTrialEndMs(store);
  if (trialEnd === null) return false;
  return trialEnd <= Date.now();
}

export function viewerOwnsStore(
  store: Store,
  user: { storeSlug: string | null; stores?: { slug?: string }[] } | null | undefined,
): boolean {
  if (!user || !store.username) return false;
  const path = store.username.toLowerCase();
  if (user.storeSlug?.toLowerCase() === path) return true;
  return Boolean(user.stores?.some((s) => (s.slug ?? '').toLowerCase() === path));
}
