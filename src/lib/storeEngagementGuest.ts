const STORAGE_KEY = 'catalog_store_engagement_guest_v1';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Stable anonymous id for store follow/like when the visitor is not logged in. */
export function getOrCreateStoreEngagementGuestToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && UUID_V4.test(existing)) {
      return existing;
    }
    const created = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return '';
  }
}
