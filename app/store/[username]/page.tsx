import type { Metadata } from 'next';
import type { Store } from '@/types';
import StorePageClient from './StorePageClient';

type StorePageProps = {
  params: Promise<{ username: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://kaushalschoolfurniture.com/api/v1/v1';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kaushalschoolfurniture.com';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type StoreSeoPayload = Partial<Store> & {
  seo_keywords?: string | null;
  keywords?: string | null;
  state?: string | null;
  district?: string | null;
};

async function fetchStoreSeo(username: string): Promise<StoreSeoPayload | null> {
  try {
    const res = await fetch(`${API_BASE.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<StoreSeoPayload>;
    return json?.data ?? null;
  } catch {
    return null;
  }
}

function buildKeywords(store: StoreSeoPayload | null): string {
  if (!store) return 'store, online shopping, marketplace';
  const explicit = (store.seo_keywords ?? store.keywords ?? '').trim();
  if (explicit) return explicit;
  const parts = [store.name, store.categoryName, store.location, 'buy online', 'marketplace'].filter(Boolean);
  return parts.join(', ');
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { username } = await params;
  const store = await fetchStoreSeo(username);
  const state = (store?.state ?? '').trim();
  const district = (store?.district ?? '').trim();
  const locPhrase =
    district && state
      ? `${district}, ${state}`
      : district || state || (store?.location ? String(store.location).trim() : '');
  const hasLoc = Boolean(locPhrase);
  const title =
    store?.name && hasLoc
      ? `${store.name} in ${locPhrase}`
      : store?.name
        ? `${store.name} - Buy Online`
        : 'Store - Buy Online';
  const description =
    store?.name && hasLoc
      ? `Buy from ${store.name} located in ${locPhrase}.`.slice(0, 160)
      : (store?.description ?? store?.shortDescription ?? 'Browse products and services from this store.')
          .toString()
          .slice(0, 160);
  const canonical = `${SITE_URL.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`;
  const keywords = buildKeywords(store);

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { username } = await params;
  const store = await fetchStoreSeo(username);
  const canonical = `${SITE_URL.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`;
  const regionState = (store?.state ?? '').trim();
  const regionDistrict = (store?.district ?? '').trim();
  const jsonLd = store
    ? {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: store.name ?? 'Store',
        url: canonical,
        description: store.description ?? store.shortDescription ?? '',
        ...(regionState || regionDistrict
          ? {
              address: {
                '@type': 'PostalAddress',
                ...(regionDistrict ? { addressLocality: regionDistrict } : {}),
                ...(regionState ? { addressRegion: regionState } : {}),
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <StorePageClient username={username} initialStore={(store as Store) ?? null} />
    </>
  );
}
