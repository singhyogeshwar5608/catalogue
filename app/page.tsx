'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react';
import StoreCard from '@/components/StoreCard';
import Image from 'next/image';
import TrendingProductsRail from '@/components/TrendingProductsRail';
import SectionHeader from '@/components/SectionHeader';
import HeroBanner from '@/components/HeroBanner';
import VerifiedSellerCard from '@/components/VerifiedSellerCard';
import StoreExplorer, { createCategorySlug } from '@/components/home/StoreExplorer';
import { getAllStores } from '@/src/lib/api';
import type { Product, Service, Store } from '@/types';
import { useLocationContext } from '@/src/context/LocationContext';
import { useSearch } from '@/src/context/SearchContext';
import { extractCityTokens } from '@/src/lib/location';

export default function HomePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [fallbackQueryUsed, setFallbackQueryUsed] = useState<string | null>(null);
  const { location, isLoading: locationDetecting } = useLocationContext();
  const { searchQuery, setSearchQuery } = useSearch();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const allStores = await getAllStores({ limit: 50 });
        setStores(allStores);
      } catch (error) {
        console.error('Failed to fetch stores:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  // Handle URL search parameters
  useEffect(() => {
    const q = searchParams?.get('q');
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams, setSearchQuery]);

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
              combined[store.id] = store;
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
          } catch (err) {
            console.warn('Coordinate-based fetch failed, trying fallback', err);
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
            } catch (err) {
              console.warn(`Location query failed for token: ${token}`, err);
            }
          }
        }

        if (isMounted) {
          const finalStores = Object.values(combined).slice(0, 12);
          setNearbyStores(finalStores);
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
    }

    return () => {
      isMounted = false;
    };
  }, [location]);

  const verifiedStores = useMemo(
    () => stores.filter((s) => s.isVerified || s.isBoosted || s.activeSubscription).slice(0, 6),
    [stores]
  );

  // Per-category position counters so each card in the same category shows a different banner image.
  const computeCategoryIndices = (list: Store[]) => {
    const counters: Record<string, number> = {};
    const map = new Map<number | string, number>();
    list.forEach((s) => {
      const key = String(s.category?.id ?? s.categoryName ?? '_');
      const idx = counters[key] ?? 0;
      map.set(s.id, idx);
      counters[key] = idx + 1;
    });
    return map;
  };

  const nearbyCatIdx = useMemo(() => computeCategoryIndices(nearbyStores), [nearbyStores]);
  const verifiedCatIdx = useMemo(() => computeCategoryIndices(verifiedStores), [verifiedStores]);

  const filteredStoresByCategory = useMemo(() => {
    let filtered = stores;
    
    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter((store) => {
        const cat = (store.categoryName || store.businessType || '').toLowerCase();
        const slug = createCategorySlug(activeCategory);
        return createCategorySlug(cat) === slug;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((store) => {
        return (
          store.name.toLowerCase().includes(query) ||
          store.description?.toLowerCase().includes(query) ||
          store.categoryName?.toLowerCase().includes(query) ||
          store.location?.toLowerCase().includes(query) ||
          store.businessType?.toLowerCase().includes(query)
        );
      });
    }
    
    return filtered;
  }, [stores, activeCategory, searchQuery]);

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  const locationLabel = location?.label || '';
  const trendingProducts = useMemo(
    () =>
      stores.flatMap((store) => {
        const storeProducts = (store.products ?? []).map((product: Product) => ({
          ...product,
          storeUsername: store.username,
          whatsapp: store.whatsapp,
        }));

        const storeServices = (store.services ?? []).map((service: Service) => ({
          id: `service-${service.id}`,
          storeId: service.storeId,
          storeName: service.storeName,
          name: service.title,
          description: service.description,
          price: service.price ?? 0,
          originalPrice: undefined,
          image: service.image,
          images: [service.image],
          category: 'Service',
          rating: 0,
          totalReviews: 0,
          inStock: service.isActive,
          storeUsername: store.username,
          whatsapp: store.whatsapp,
        }));

        return [...storeProducts, ...storeServices];
      }),
    [stores]
  );

  const renderResponsiveStoreGrid = (
    list: Store[],
    bannerIndexMap?: Map<number | string, number>,
    showMobileAllStoresButton = false
  ) => (
    <>
      <div className="grid grid-cols-2 gap-4 sm:hidden">
        {list.slice(0, 7).map((store, index) => {
          const chunkIndex = index % 7;
          const isFullWidth = chunkIndex === 0;
          const categoryBannerIndex = bannerIndexMap?.get(store.id) ?? 0;

          if (isFullWidth) {
            return (
              <div key={store.id} className="col-span-2">
                <VerifiedSellerCard store={store} categoryBannerIndex={categoryBannerIndex} />
              </div>
            );
          }

          return (
            <div key={store.id} className="col-span-1 min-w-0">
              <StoreCard store={store} isCompact categoryBannerIndex={categoryBannerIndex} />
            </div>
          );
        })}
      </div>

      {showMobileAllStoresButton ? (
        <div className="mt-[10px] flex justify-center sm:hidden">
          <Link
            href="/all-stores"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            All Stores
          </Link>
        </div>
      ) : null}

      <div className="hidden grid-cols-1 gap-6 sm:grid md:grid-cols-2 lg:grid-cols-3">
        {list.map((store) => (
          <VerifiedSellerCard key={store.id} store={store} categoryBannerIndex={bannerIndexMap?.get(store.id) ?? 0} />
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <HeroBanner locationName={locationLabel} />

      <section className="bg-[#faf7f2] px-5 py-[3%] sm:py-14">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-700/90 text-center sm:text-left">WHY CATELOG</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 mt-2 text-center sm:text-left">
            Shop local. Live better.
          </h2>
          <p className="mt-3 mx-auto max-w-2xl text-center text-[0.95rem] font-medium text-slate-600 sm:mx-0 sm:text-left sm:text-base">
            Discover trusted neighbourhood stores, get doorstep support, and shop confidently with honest reviews from real customers across {locationLabel || 'your area'}.
          </p>

          <div className="mt-8 hidden gap-4 sm:grid sm:grid-cols-3">
            <div className="rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-950 via-cyan-900 to-blue-950 p-5 shadow-[0_18px_44px_-20px_rgba(8,47,73,0.7)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sky-200">
                <Shield className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-white">Verified Local Sellers</p>
              <p className="mt-1 text-sm leading-relaxed text-sky-100/90">Every marketplace partner is hand-checked for quality, pricing transparency, and reliable service.</p>
            </div>
            <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 p-5 shadow-[0_18px_44px_-20px_rgba(6,78,59,0.72)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-emerald-200">
                <Zap className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-white">Same-Day Assistance</p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-100/90">Need exchanges, returns, or delivery help? Our {locationLabel || 'local'} support desk is just a tap away 7 days a week.</p>
            </div>
            <div className="rounded-2xl border border-violet-900/40 bg-gradient-to-br from-violet-950 via-indigo-900 to-slate-950 p-5 shadow-[0_18px_44px_-20px_rgba(76,29,149,0.72)]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-violet-200">
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-white">Smart Reviews & Ratings</p>
              <p className="mt-1 text-sm leading-relaxed text-violet-100/90">Real shoppers share photos, ratings, and tips so you know exactly what to expect before you order.</p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] bg-slate-900 text-white px-6 py-6 shadow-[0_25px_60px_-30px_rgba(15,23,42,1)] border border-white/10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">COMMUNITY PULSE</p>
                <p className="text-lg font-semibold mt-1">Loved by shoppers across {locationLabel || 'India'}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 divide-x divide-white/20 text-center text-sm sm:flex sm:w-auto sm:divide-x-0 sm:gap-6 sm:text-left">
                <div className="px-1 first:pl-0 sm:px-0 sm:first:pl-0">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">Happy shoppers</p>
                  <p className="text-2xl font-semibold mt-1">2,300+</p>
                </div>
                <div className="px-1 first:pl-0 sm:px-0 sm:first:pl-0">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">Partner stores</p>
                  <p className="text-2xl font-semibold mt-1">180</p>
                </div>
                <div className="px-1 first:pl-0 sm:px-0 sm:first:pl-0">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/70">Avg. satisfaction</p>
                  <p className="text-2xl font-semibold mt-1">4.8/5</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="stores" className="px-4 py-0 bg-white sm:py-12">
        <div className="max-w-7xl mx-auto">
          <StoreExplorer
            stores={filteredStoresByCategory}
            activeCategory={activeCategory}
            onSelectCategory={handleCategoryChange}
          />
        </div>
      </section>

      <section className="px-4 pb-0 pt-[5%] sm:py-12">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title={locationDetecting ? 'Detecting your area…' : 'Near You'}
            compactOnMobile
            subtitle={
              location
                ? `Stores close to ${location.label}`
                : 'Set your location to find nearby shops'
            }
          />
          {nearbyLoading && (
            <p className="text-center text-gray-500 py-8">Loading stores near you…</p>
          )}
          {nearbyError && <p className="text-center text-red-500 py-8">{nearbyError}</p>}
          {!nearbyLoading && !nearbyError && nearbyStores.length === 0 && location && (
            <p className="text-center text-gray-500 py-8">
              No stores found within 50 km. Try expanding your search radius from the header.
            </p>
          )}
          {!nearbyLoading && !nearbyError && nearbyStores.length === 0 && !location && (
            <p className="text-center text-gray-500 py-8">
              Use the location selector at the top to see stores near you.
            </p>
          )}
          {!nearbyLoading && nearbyStores.length > 0 && (
            renderResponsiveStoreGrid(nearbyStores, nearbyCatIdx, true)
          )}
          {fallbackQueryUsed && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Showing results for: {fallbackQueryUsed}
            </p>
          )}
        </div>
      </section>

      <section className="px-4 py-0 bg-white sm:py-12">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title="Verified Sellers"
            subtitle="Trusted stores with verified badges"
          />
          {renderResponsiveStoreGrid(verifiedStores, verifiedCatIdx, true)}
        </div>
      </section>

      <section id="products" className="px-4 py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-0 py-0 sm:px-0 sm:py-0">
          <SectionHeader
            title="Trending Products"
            subtitle="Popular products and services from our marketplace"
            action={
              <Link
                href="/products"
                className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:inline-flex"
              >
                View All Products
              </Link>
            }
          />
          <TrendingProductsRail products={trendingProducts} />
        </div>
      </section>

      <section className="py-16 px-4 bg-gradient-to-br from-primary to-primary-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to grow your business?</h2>
          <p className="text-lg mb-8 text-primary-50">
            Join thousands of local sellers already thriving on our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create-store"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              <Shield className="w-5 h-5" />
              Start Selling Today
            </Link>
            <Link
              href="/all-stores"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition font-semibold"
            >
              <TrendingUp className="w-5 h-5" />
              Browse Stores
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
