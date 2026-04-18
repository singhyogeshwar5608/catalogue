import type { Store } from '@/types';

/**
 * Exact match of normalized search text to `store.id` (trim + lowercase),
 * so users can find a store by typing its id in the global search bar.
 */
export function storeSearchMatchesId(store: Store, queryLowerTrimmed: string): boolean {
  if (!queryLowerTrimmed) return false;
  return String(store.id).trim().toLowerCase() === queryLowerTrimmed;
}
