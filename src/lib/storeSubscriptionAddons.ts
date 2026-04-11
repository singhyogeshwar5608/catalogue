import type { Store } from '@/types';

/** True if the store has at least one subscription add-on enabled (drives Payment settings nav). */
export function storeHasSubscriptionAddonAccess(store: Store | null | undefined): boolean {
  const a = store?.subscriptionAddons;
  if (!a) return false;
  return Boolean(a.paymentGateway || a.qrCode || a.paymentGatewayHelp);
}

/** Fired after subscription add-ons or profile fields change so dashboard chrome can refetch (pathname may not change). */
export const STORE_PROFILE_REFRESH_EVENT = 'catalog-store-profile-refresh';

export function dispatchStoreProfileRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STORE_PROFILE_REFRESH_EVENT));
}
