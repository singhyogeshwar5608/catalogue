import type { MetadataRoute } from 'next';
import { fetchLocationLinksFromLaravel } from '@/lib/server/laravel-location-links';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://kaushalschoolfurniture.com/api/v1/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kaushalschoolfurniture.com';

type StoreLinkRow = {
  slug?: string | null;
  username?: string | null;
  updated_at?: string | null;
};

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

async function fetchStoreLinks(): Promise<StoreLinkRow[]> {
  try {
    const res = await fetch(`${API_BASE.replace(/\/+$/, '')}/stores/internal-links`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as ApiEnvelope<StoreLinkRow[]>;
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = SITE_URL.replace(/\/+$/, '');
  const [stores, locations] = await Promise.all([fetchStoreLinks(), fetchLocationLinksFromLaravel()]);
  const urls: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  for (const store of stores) {
    const path = (store.username ?? store.slug ?? '').trim();
    if (!path) continue;
    urls.push({
      url: `${origin}/store/${encodeURIComponent(path)}`,
      lastModified: store.updated_at ? new Date(store.updated_at) : undefined,
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }

  for (const loc of locations) {
    const ss = (loc.state_slug ?? '').trim();
    const ds = (loc.district_slug ?? '').trim();
    if (!ss || !ds) continue;
    urls.push({
      url: `${origin}/stores/${encodeURIComponent(ss)}/${encodeURIComponent(ds)}`,
      changeFrequency: 'weekly',
      priority: 0.65,
    });
  }

  return urls;
}
