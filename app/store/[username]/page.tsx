import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Store } from '@/types';
import StorePageClient from './StorePageClient';

type StorePageProps = {
  params: Promise<{ username: string }>;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  `${(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '')}/api/v1/v1`;
const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://larawans.com';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type StoreSeoPayload = Partial<Store> & {
  seo_keywords?: string | null;
  keywords?: string | null;
  state?: string | null;
  district?: string | null;
};

function toAbsoluteAssetUrl(input?: string | null): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }

  const siteBase = SITE_URL.replace(/\/+$/, '');
  if (value.startsWith('/')) {
    return `${siteBase}${value}`;
  }
  if (value.startsWith('storage/')) {
    return `${siteBase}/${value}`;
  }
  if (value.startsWith('store-logos/') || value.startsWith('products/')) {
    return `${siteBase}/storage/${value}`;
  }

  const apiOrigin = (() => {
    try {
      return new URL(API_BASE).origin;
    } catch {
      return siteBase;
    }
  })();

  return `${apiOrigin}/${value.replace(/^\/+/, '')}`;
}

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

function buildSeoDescription(store: StoreSeoPayload): string {
  const raw = String(store.description ?? store.shortDescription ?? '').trim();
  if (raw) return raw.slice(0, 160);

  const name = String(store.name ?? 'This store').trim();
  const area = String(store.location ?? '').trim();
  if (area) {
    return `Shop online from ${name} in ${area}. Explore products, trusted service, and fast support on our marketplace.`.slice(
      0,
      160
    );
  }
  return `Shop online from ${name}. Explore products, trusted service, and fast support on our marketplace.`.slice(
    0,
    160
  );
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { username } = await params;
  const store = await fetchStoreSeo(username);
  if (!store) {
    const canonical = `${SITE_URL.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`;
    return {
      title: 'Store Not Found',
      description: 'The requested store could not be found.',
      alternates: { canonical },
      robots: { index: false, follow: true },
      openGraph: {
        title: 'Store Not Found',
        description: 'The requested store could not be found.',
        url: canonical,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: 'Store Not Found',
        description: 'The requested store could not be found.',
      },
    };
  }

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
      : buildSeoDescription(store);
  const canonical = `${SITE_URL.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`;
  const keywords = buildKeywords(store);
  const logo = toAbsoluteAssetUrl(store.logo ?? null);

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
      images: logo ? [{ url: logo, alt: `${store.name ?? 'Store'} logo` }] : undefined,
    },
    twitter: {
      card: logo ? 'summary_large_image' : 'summary',
      title,
      description,
      images: logo ? [logo] : undefined,
    },
    icons: logo
      ? {
          icon: [{ url: logo }],
          shortcut: [{ url: logo }],
          apple: [{ url: logo }],
        }
      : undefined,
    other: {
      ...(logo ? { 'og:image': logo } : {}),
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
  if (!store) {
    notFound();
  }
  const canonical = `${SITE_URL.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`;
  const regionState = (store?.state ?? '').trim();
  const regionDistrict = (store?.district ?? '').trim();
  const jsonLd = store
    ? {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: store.name ?? 'Store',
        url: canonical,
        description: buildSeoDescription(store),
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
