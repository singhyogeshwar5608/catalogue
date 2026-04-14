'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import VerifiedSellerCard from '@/components/VerifiedSellerCard';
import StoreCard from '@/components/StoreCard';
import { getAllStores } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { useLocationContext } from '@/src/context/LocationContext';
import { extractCityTokens } from '@/src/lib/location';
import { prioritizeCurrentUserStore } from '@/src/lib/prioritize-user-store';
import type { Store } from '@/types';

const createSlug = (value: string) =>
  value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function AllStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [fallbackQueryUsed, setFallbackQueryUsed] = useState<string | null>(null);
  const { location, isLoading: locationDetecting } = useLocationContext();
  const { user } = useAuth();

  useEffect(() => {
    const loadStores = async () => {
      try {
        const allStores = await getAllStores({ limit: 120 });
        setStores(allStores);
      } catch (error) {
        console.error('Failed to load stores page data:', error);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchNearby = async () => {
      setNearbyLoading(true);
      setNearbyError(null);
      setFallbackQueryUsed(null);

      try {
        const combined: Record<string, Store> = {};
        const addStores = (items: Store[]) => {
          items.forEach((store) => {
            // Only add stores that are active and have valid data
            if (store.isActive && store.id && store.name) {
              combined[String(store.id)] = store;
            }
          });
        };

        if (location?.latitude && location?.longitude) {
          try {
            const coordStores = await getAllStores({
              lat: location.latitude,
              lng: location.longitude,
              radiusKm: 50,
              limit: 12,
            });
            addStores(coordStores);
          } catch (error) {
            console.warn('Coordinate-based fetch failed, trying fallback', error);
          }
        }

        if (location?.label) {
          const cityTokens = extractCityTokens(location.label);
          for (const token of cityTokens) {
            try {
              const labelStores = await getAllStores({ location: token, limit: 12 });
              addStores(labelStores);
              if (Object.keys(combined).length === 0) {
                setFallbackQueryUsed(token);
              }
              break; // Only use first successful token to avoid multiple API calls
            } catch (error) {
              console.warn(`Location query failed for token: ${token}`, error);
            }
          }
        }

        if (isMounted) {
          setNearbyStores(Object.values(combined).slice(0, 12));
        }
      } catch (error) {
        console.error('Failed to fetch nearby stores:', error);
        if (isMounted) {
          setNearbyError('Unable to load nearby stores. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setNearbyLoading(false);
        }
      }
    };

    if (location) {
      fetchNearby();
    } else {
      setNearbyStores([]);
      setNearbyLoading(false);
      setNearbyError(null);
      setFallbackQueryUsed(null);
    }

    return () => {
      isMounted = false;
    };
  }, [location]);

  const orderedStores = useMemo(() => prioritizeCurrentUserStore(stores, user), [stores, user]);

  const orderedNearbyStores = useMemo(
    () => prioritizeCurrentUserStore(nearbyStores, user),
    [nearbyStores, user]
  );

  const categoryOptions = useMemo(() => {
    const labels = Array.from(
      new Set(orderedStores.map((store) => (store.categoryName ?? store.businessType).trim()).filter(Boolean))
    );

    return [{ id: 'all', label: 'All stores' }, ...labels.map((label) => ({ id: createSlug(label), label }))];
  }, [orderedStores]);

  const filteredStores = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return orderedStores.filter((store) => {
      const categoryLabel = store.categoryName ?? store.businessType;
      const matchesCategory = activeCategory === 'all' || createSlug(categoryLabel) === activeCategory;
      if (!matchesCategory) return false;

      if (!query) return true;

      return [store.name, store.description, store.shortDescription, store.location, categoryLabel]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [activeCategory, searchQuery, orderedStores]);

  const featuredStores = useMemo(
    () => filteredStores.filter((store) => store.isVerified || store.activeSubscription || store.isBoosted).slice(0, 3),
    [filteredStores]
  );

  const computeCategoryIndices = (list: Store[]) => {
    const counters: Record<string, number> = {};
    const map = new Map<number | string, number>();
    list.forEach((store) => {
      const key = String(store.category?.id ?? store.categoryName ?? '_');
      const idx = counters[key] ?? 0;
      map.set(store.id, idx);
      counters[key] = idx + 1;
    });
    return map;
  };

  const nearbyCatIdx = useMemo(() => computeCategoryIndices(orderedNearbyStores), [orderedNearbyStores]);
  const featuredCatIdx = useMemo(() => computeCategoryIndices(featuredStores), [featuredStores]);
  const filteredCatIdx = useMemo(() => computeCategoryIndices(filteredStores), [filteredStores]);

  const renderResponsiveStoreGrid = (list: Store[], bannerIndexMap?: Map<number | string, number>) => (
    <>
      <div className="grid grid-cols-2 gap-4 sm:hidden">
        {list.map((store, index) => {
          const chunkIndex = index % 7;
          const isFullWidth = chunkIndex === 0;
          const categoryBannerIndex = bannerIndexMap?.get(store.id) ?? 0;

          if (isFullWidth) {
            return (
              <div key={store.id} className="col-span-2 min-h-0 w-full">
                <VerifiedSellerCard store={store} categoryBannerIndex={categoryBannerIndex} />
              </div>
            );
          }

          return (
            <div key={store.id} className="col-span-1 min-h-0 min-w-0 w-full">
              <StoreCard store={store} isCompact categoryBannerIndex={categoryBannerIndex} />
            </div>
          );
        })}
      </div>

      <div className="hidden grid-cols-1 gap-6 sm:grid lg:grid-cols-3">
        {list.map((store) => (
          <div key={store.id} className="min-h-0 w-full">
            <VerifiedSellerCard store={store} categoryBannerIndex={bannerIndexMap?.get(store.id) ?? 0} />
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <section className="hidden lg:block bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#eef2ff_35%,#f8fafc_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-10 px-6 py-12">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Discover stores</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Find verified local sellers and services in one curated marketplace.
            </h1>
            <p className="text-base text-slate-600">
              Browse across hundreds of categories, explore nearby businesses, and chat directly with owners.
              Every profile is designed to highlight trust signals and make it easy to shop or collaborate.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/create-store"
                className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2 font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start selling
              </Link>
              <a
                href="#directory"
                className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
              >
                Explore directory
              </a>
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-6 text-sm text-slate-600">
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Active stores</dt>
                <dd className="text-2xl font-semibold text-slate-900">450+</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Cities covered</dt>
                <dd className="text-2xl font-semibold text-slate-900">36</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">Avg. rating</dt>
                <dd className="text-2xl font-semibold text-slate-900">4.8/5</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-4 rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-[0_30px_60px_-25px_rgba(15,23,42,0.35)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Trusted Retailers</p>
            <div className="space-y-4 text-slate-700">
              {orderedStores.length > 0 ? (
                orderedStores.slice(0, 3).map((store) => (
                  <div key={store.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Featured store</p>
                    <p className="text-lg font-semibold text-slate-900">{store.name}</p>
                    <p className="text-sm text-slate-600">{store.description || 'Quality products and services from trusted local businesses.'}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-600">No stores available yet. Be the first to create a store!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <section
        className="fixed inset-x-0 z-40 w-full rounded-b-[20px] border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] sm:static sm:top-auto sm:inset-auto sm:mt-6 lg:mt-10"
        style={{ top: 'calc(4rem + var(--mobile-quick-search-height, 0px))' }}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-[2%] sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="flex flex-col gap-2 sm:gap-4">

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] sm:gap-2 sm:pb-1">
              {categoryOptions.map((category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <div
        className="sm:hidden"
        style={{
          height:
            'calc(2.75rem + var(--mobile-quick-search-height, 0px))',
        }}
        aria-hidden="true"
      />

      <section className="mx-auto max-w-7xl px-4 pb-0 pt-3 sm:px-6 sm:pt-8 sm:pb-14 lg:px-8 lg:pb-20">
        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-20 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
            <p className="mt-4 text-sm font-medium text-slate-500">Loading stores...</p>
          </div>
        ) : filteredStores.length ? (
          <div className="space-y-10">
            {featuredStores.length ? (
              <div className="space-y-0 pt-1 sm:mt-[5px] sm:pt-0">
                <div className="mb-0 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Featured</p>
                    <h2 className="mt-0 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Verified & boosted sellers</h2>
                  </div>
                </div>
                {renderResponsiveStoreGrid(featuredStores, featuredCatIdx)}
              </div>
            ) : null}

            <div>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Directory</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">All matching stores</h2>
                </div>
                <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  Explore stores by category and location
                </p>
              </div>
              {renderResponsiveStoreGrid(filteredStores, filteredCatIdx)}
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-4 py-20 text-center shadow-sm">
            <p className="text-xl font-semibold text-slate-950">No stores found</p>
            <p className="mt-2 text-slate-500">Try changing the category or clearing your search.</p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 sm:pb-14 lg:px-8 lg:pb-20">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Nearby</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {locationDetecting ? 'Detecting your area...' : 'Near By'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {location ? location.label : 'Set your location from the header'}
            </p>
          </div>
        </div>

        {nearbyLoading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-20 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
            <p className="mt-4 text-sm font-medium text-slate-500">Loading nearby stores...</p>
          </div>
        ) : nearbyError ? (
          <div className="rounded-[28px] border border-red-200 bg-white px-4 py-20 text-center shadow-sm">
            <p className="text-sm text-red-600">{nearbyError}</p>
          </div>
        ) : orderedNearbyStores.length > 0 ? (
          renderResponsiveStoreGrid(orderedNearbyStores, nearbyCatIdx)
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-4 py-20 text-center shadow-sm">
            <p className="text-slate-500">
              {location
                ? 'No nearby stores found within 50 km right now.'
                : 'Use the location selector in the header to see nearby stores here.'}
            </p>
          </div>
        )}

        {fallbackQueryUsed ? (
          <p className="mt-4 text-center text-xs text-slate-400">Showing nearby results for: {fallbackQueryUsed}</p>
        ) : null}
      </section>
    </div>
  );
}
