/**
 * Server-only fetch helpers for Laravel store endpoints (no `use client`).
 * Used by `/api/stores` so Redis can wrap responses.
 */

import type { Store } from '@/types';
import {
  normalizeStore,
  type ApiEnvelope,
  type BackendStore,
} from '@/src/lib/api-shared';
import { prefetchFreeTrialDays } from '@/src/lib/freeTrialDays';

const LIVE_API_BASE = 'https://kaushalschoolfurniture.com/api/v1/v1';

export function getServerLaravelApiBase(): string {
  const v = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (v && v.length > 0) return v.replace(/\/+$/, '');
  return LIVE_API_BASE;
}

function parseStoreListPayload(raw: unknown): BackendStore[] {
  if (Array.isArray(raw)) return raw as BackendStore[];
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: BackendStore[] }).data;
  }
  return [];
}

/** GET /stores?… — same query shape as {@link getAllStores} in `src/lib/api.ts`. */
export async function fetchStoresFromLaravel(queryString: string): Promise<Store[]> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const path = queryString ? `/stores?${queryString}` : '/stores';
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Stores upstream HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  const envelope = (await res.json()) as ApiEnvelope<BackendStore[]>;
  const rows = parseStoreListPayload(envelope.data);
  return rows.map(normalizeStore);
}

/** GET /store/{username} — public store payload. */
export async function fetchStoreByUsernameFromLaravel(username: string): Promise<Store | null> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const res = await fetch(`${base}/store/${encodeURIComponent(username)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Store upstream HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  const envelope = (await res.json()) as ApiEnvelope<BackendStore>;
  const data = envelope.data;
  if (!data || typeof data !== 'object') return null;
  return normalizeStore(data);
}
