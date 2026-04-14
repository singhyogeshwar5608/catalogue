'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
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
import { useAuth } from '@/src/context/AuthContext';
import { extractCityTokens } from '@/src/lib/location';
import { prioritizeCurrentUserStore } from '@/src/lib/prioritize-user-store';

export default function HomePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [fallbackQueryUsed, setFallbackQueryUsed] = useState<string | null>(null);
  const { location, isLoading: locationDetecting } = useLocationContext();
  const { searchQuery, setSearchQuery } = useSearch();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const allStores = await getAllStores({ limit: 50 });
        console.log('Frontend: All stores fetched:', allStores);
        console.log('Frontend: Store count:', allStores.length);
        allStores.forEach((store, index) => {
          console.log(`Frontend: Store ${index + 1}:`, store.name, store.id, store.isActive);
        });
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
          console.log('Frontend: Adding stores:', items);
          items.forEach((store) => {
            console.log('Frontend: Checking store:', store.name, store.id, store.isActive);
            // Only add stores that are active and have valid data
            if (store.isActive && store.id && store.name) {
              console.log('Frontend: Adding store to combined:', store.name);
              combined[store.id] = store;
            } else {
              console.log('Frontend: Skipping store (inactive or invalid):', store.name);
            }
          });
          console.log('Frontend: Combined stores after adding:', Object.keys(combined));
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
          console.log('Frontend: Nearby stores final:', finalStores);
          console.log('Frontend: Nearby store count:', finalStores.length);
          finalStores.forEach((store, index) => {
            console.log(`Frontend: Nearby Store ${index + 1}:`, store.name, store.id, store.isActive);
          });
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

  const orderedStores = useMemo(() => prioritizeCurrentUserStore(stores, user), [stores, user]);

  const orderedNearbyStores = useMemo(
    () => prioritizeCurrentUserStore(nearbyStores, user),
    [nearbyStores, user]
  );

  const verifiedStores = useMemo(
    () =>
      orderedStores.filter((s) => s.isVerified || s.isBoosted || s.activeSubscription).slice(0, 6),
    [orderedStores]
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

  const nearbyCatIdx = useMemo(() => computeCategoryIndices(orderedNearbyStores), [orderedNearbyStores]);
  const verifiedCatIdx = useMemo(() => computeCategoryIndices(verifiedStores), [verifiedStores]);

  const filteredStoresByCategory = useMemo(() => {
    let filtered = orderedStores;
    
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
  }, [orderedStores, activeCategory, searchQuery]);

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  const locationLabel = location?.label || '';
  const trendingProducts = useMemo(
    () =>
      orderedStores.flatMap((store) => {
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
<<<<<<< HEAD
              <div key={store.id} className="col-span-2 min-h-0 w-full">
=======
              <div key={store.id} className="col-span-2 h-full min-h-0">
>>>>>>> origin/main
                <VerifiedSellerCard store={store} categoryBannerIndex={categoryBannerIndex} />
              </div>
            );
          }

          return (
<<<<<<< HEAD
            <div key={store.id} className="col-span-1 min-h-0 min-w-0 w-full">
=======
            <div key={store.id} className="col-span-1 min-h-0 min-w-0 h-full">
>>>>>>> origin/main
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
<<<<<<< HEAD
          <div key={store.id} className="min-h-0 w-full">
=======
          <div key={store.id} className="h-full min-h-0">
>>>>>>> origin/main
            <VerifiedSellerCard store={store} categoryBannerIndex={bannerIndexMap?.get(store.id) ?? 0} />
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <HeroBanner />

      <section className="relative overflow-hidden px-5 py-12 sm:py-16 lg:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(251,191,36,0.18),transparent_50%),radial-gradient(ellipse_80%_60%_at_100%_50%,rgba(45,212,191,0.12),transparent_45%),radial-gradient(ellipse_70%_50%_at_0%_80%,rgba(167,139,250,0.1),transparent_40%)]"
          aria-hidden
        />
<<<<<<< HEAD
        <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-amber-200/30 blur-[100px]" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-teal-300/25 blur-[90px] opacity-90"
=======
        <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-amber-200/30 blur-[100px] motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-teal-300/25 blur-[90px] opacity-90 motion-safe:animate-pulse motion-reduce:animate-none"
>>>>>>> origin/main
          style={{ animationDelay: '1.2s' }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
            }}
          >
            <motion.p
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="text-center text-[11px] font-bold uppercase tracking-[0.42em] text-amber-800/90 sm:text-left sm:text-xs"
            >
              <span className="bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700 bg-clip-text text-transparent">
                WHY CATELOG
              </span>
            </motion.p>

            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="mt-3 text-center text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-left sm:text-4xl lg:text-[2.35rem]"
            >
              <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                Shop local. Live better.
              </span>
            </motion.h2>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="mx-auto mt-4 max-w-2xl text-center text-[0.95rem] font-medium leading-relaxed text-slate-600 sm:mx-0 sm:text-left sm:text-base"
            >
              Discover trusted neighbourhood stores, get doorstep support, and shop confidently with honest reviews from real customers across {locationLabel || 'your area'}.
            </motion.p>
          </motion.div>

          <motion.div
<<<<<<< HEAD
            className="mt-10 hidden gap-4 sm:mt-12 sm:grid sm:grid-cols-3"
=======
            className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3"
>>>>>>> origin/main
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group relative overflow-hidden rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-950 via-cyan-950 to-blue-950 p-5 shadow-[0_20px_50px_-18px_rgba(8,47,73,0.75)] ring-1 ring-white/10 transition-shadow duration-300 hover:shadow-[0_28px_60px_-20px_rgba(34,211,238,0.35)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-70" aria-hidden />
              <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sky-200 shadow-inner ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="relative text-sm font-semibold text-white">Verified Local Sellers</p>
              <p className="relative mt-1.5 text-sm leading-relaxed text-sky-100/90">
                Every marketplace partner is hand-checked for quality, pricing transparency, and reliable service.
              </p>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 p-5 shadow-[0_20px_50px_-18px_rgba(6,78,59,0.78)] ring-1 ring-white/10 transition-shadow duration-300 hover:shadow-[0_28px_60px_-20px_rgba(52,211,153,0.35)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl opacity-70 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
              <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-emerald-200 shadow-inner ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="relative text-sm font-semibold text-white">Same-Day Assistance</p>
              <p className="relative mt-1.5 text-sm leading-relaxed text-emerald-100/90">
                Need exchanges, returns, or delivery help? Our {locationLabel || 'local'} support desk is just a tap away 7 days a week.
              </p>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-5 shadow-[0_20px_50px_-18px_rgba(76,29,149,0.78)] ring-1 ring-white/10 transition-shadow duration-300 hover:shadow-[0_28px_60px_-20px_rgba(167,139,250,0.35)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl opacity-70 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
              <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-violet-200 shadow-inner ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="relative text-sm font-semibold text-white">Smart Reviews & Ratings</p>
              <p className="relative mt-1.5 text-sm leading-relaxed text-violet-100/90">
                Real shoppers share photos, ratings, and tips so you know exactly what to expect before you order.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="relative mt-10 overflow-hidden rounded-[28px] border border-white/20 bg-slate-900/95 px-6 py-7 text-white shadow-[0_28px_70px_-28px_rgba(15,23,42,0.95)] ring-1 ring-slate-700/60 backdrop-blur-sm sm:mt-12"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-violet-500/10" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.42em] text-teal-200/80">COMMUNITY PULSE</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                  Loved by shoppers across {locationLabel || 'India'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 divide-x divide-white/15 text-center text-sm sm:flex sm:w-auto sm:divide-x-0 sm:gap-8 sm:text-left">
                <motion.div
                  className="px-1 first:pl-0 sm:px-0"
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/65">Happy shoppers</p>
                  <p className="mt-1 bg-gradient-to-br from-white to-slate-200 bg-clip-text text-2xl font-semibold tabular-nums text-transparent">2,300+</p>
                </motion.div>
                <motion.div
                  className="px-1 first:pl-0 sm:px-0"
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.22, duration: 0.4 }}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/65">Partner stores</p>
                  <p className="mt-1 bg-gradient-to-br from-white to-slate-200 bg-clip-text text-2xl font-semibold tabular-nums text-transparent">180</p>
                </motion.div>
                <motion.div
                  className="px-1 first:pl-0 sm:px-0"
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.29, duration: 0.4 }}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/65">Avg. satisfaction</p>
                  <p className="mt-1 bg-gradient-to-br from-white to-slate-200 bg-clip-text text-2xl font-semibold tabular-nums text-transparent">4.8/5</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
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
          {!nearbyLoading && !nearbyError && orderedNearbyStores.length === 0 && location && (
            <p className="text-center text-gray-500 py-8">
              No stores found within 50 km. Try expanding your search radius from the header.
            </p>
          )}
          {!nearbyLoading && !nearbyError && orderedNearbyStores.length === 0 && !location && (
            <p className="text-center text-gray-500 py-8">
              Use the location selector at the top to see stores near you.
            </p>
          )}
          {!nearbyLoading && orderedNearbyStores.length > 0 && (
            renderResponsiveStoreGrid(orderedNearbyStores, nearbyCatIdx, true)
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
