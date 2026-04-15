import { NextResponse } from 'next/server';
import { withCache } from '@/lib/withCache';
import { fetchStoresFromLaravel } from '@/lib/server/laravel-stores';

/** No time-based expiry — purge via `POST /api/cache/invalidate` or after store mutations you wire up. */
const CACHE_TTL = null;

/**
 * GET /api/stores?search=&category=&location=&state=&district=&only_verified=1&only_boosted=1&limit=&lat=&lng=&radius_km=&include_inactive=1
 * Proxies Laravel `/stores` and caches in Redis as `stores:list:v5?<query>` (v5: listing includes per-store `banner`).
 * `state` + `district` filter active stores for SEO location hubs (see `app/stores/[state]/[district]/page.tsx`).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const cacheKey = `stores:list:v5?${qs || '_'}`;

    const stores = await withCache(
      cacheKey,
      () => fetchStoresFromLaravel(qs),
      CACHE_TTL,
      {
        skipSetIf: (rows) => !Array.isArray(rows) || rows.length === 0,
      },
    );

    return NextResponse.json({ success: true, data: stores });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load stores';
    return NextResponse.json({ success: false, message, data: [] }, { status: 502 });
  }
}
