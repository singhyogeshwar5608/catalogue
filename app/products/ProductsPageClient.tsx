'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/SectionHeader';
import ProductCard from '@/components/ProductCard';
import { getProductsByStore, getServicesByStore } from '@/src/lib/api';
import { perfLog } from '@/src/lib/perfLog';
import { useAuth } from '@/src/context/AuthContext';
import { useSearch } from '@/src/context/SearchContext';
import { prioritizeCurrentUserStore } from '@/src/lib/prioritize-user-store';
import type { Product, Service, Store } from '@/types';

export type ListingItem = Product & {
  storeUsername?: string;
  whatsapp?: string;
};

const STORES_BATCH_SIZE = 8;

function dedupeStoresById(stores: Store[]): Store[] {
  const seen = new Set<string>();
  return stores.filter((s) => {
    const id = String(s.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function listingDedupeKey(item: ListingItem): string {
  const sid = item.storeId != null && item.storeId !== '' ? String(item.storeId) : '';
  const un = item.storeUsername?.trim() ?? '';
  return `${sid || un || 'store'}-${String(item.id)}`;
}

export default function ProductsPageClient({ initialStores }: { initialStores: Store[] }) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [items, setItems] = useState<ListingItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(initialStores.length > 0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialStores.length > 0);
  const [cursor, setCursor] = useState(0);
  const { user } = useAuth();
  const { searchQuery } = useSearch();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const orderedStoresRef = useRef<Store[]>([]);

  useLayoutEffect(() => {
    const prioritized = prioritizeCurrentUserStore(dedupeStoresById(initialStores), user);
    setStores(prioritized);
    orderedStoresRef.current = prioritized;
    setItems([]);
    setCursor(0);
    setHasMore(prioritized.length > 0);
    setIsInitialLoading(prioritized.length > 0);
    setIsFetchingMore(false);
  }, [initialStores, user?.id]);

  useEffect(() => {
    perfLog('products', `client ready (${initialStores.length} stores from server)`);
  }, [initialStores.length]);

  const mapStoreItems = useCallback(async (store: Store): Promise<ListingItem[]> => {
    const [storeProducts, storeServices] = await Promise.all([
      getProductsByStore(store.id).catch(() => [] as Product[]),
      getServicesByStore(store.id).catch(() => [] as Service[]),
    ]);

    const productsFromDb = storeProducts.map((product) => ({
      ...product,
      storeUsername: store.username,
      whatsapp: store.whatsapp,
    }));

    const servicesFromDb = storeServices.map((service) => ({
      id: `service-${service.id}`,
      storeId: service.storeId,
      storeName: service.storeName,
      name: service.title,
      description: service.description,
      price: service.price ?? 0,
      originalPrice: undefined,
      image: service.image,
      images: service.image ? [service.image] : [],
      category: 'Service',
      rating: 0,
      totalReviews: 0,
      inStock: service.isActive,
      storeUsername: store.username,
      whatsapp: store.whatsapp,
    }));

    return [...productsFromDb, ...servicesFromDb];
  }, []);

  const loadNextBatch = useCallback(async () => {
    if (isFetchingMore) return;
    const orderedStores = orderedStoresRef.current;
    if (cursor >= orderedStores.length) {
      setHasMore(false);
      setIsInitialLoading(false);
      return;
    }

    setIsFetchingMore(true);
    try {
      const nextStores = orderedStores.slice(cursor, cursor + STORES_BATCH_SIZE);
      const listingRows = await Promise.all(nextStores.map((store) => mapStoreItems(store)));
      setItems((previous) => {
        const seen = new Set(previous.map((p) => listingDedupeKey(p)));
        const next: ListingItem[] = [...previous];
        for (const row of listingRows.flat()) {
          const k = listingDedupeKey(row);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push(row);
        }
        return next;
      });
      const nextCursor = cursor + nextStores.length;
      setCursor(nextCursor);
      setHasMore(nextCursor < orderedStores.length);
    } finally {
      setIsFetchingMore(false);
      setIsInitialLoading(false);
    }
  }, [cursor, isFetchingMore, mapStoreItems]);

  useEffect(() => {
    if (stores.length === 0 || items.length > 0 || isFetchingMore) return;
    void loadNextBatch();
  }, [items.length, isFetchingMore, loadNextBatch, stores.length]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void loadNextBatch();
          }
        });
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loadNextBatch]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [item.name, item.description, item.category, item.storeName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  return (
    <main className="min-h-screen bg-white px-4 pt-3 pb-8 sm:px-6 sm:pt-10 sm:pb-12 lg:px-8 lg:pt-14 lg:pb-20">
      <div
        className="sm:hidden"
        style={{ height: 'var(--mobile-quick-search-height, 0px)' }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          compactOnMobile
          title="All Products"
          subtitle="Products and services from all stores"
          action={
            <Link
              href="/all-stores"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:inline-flex"
            >
              Browse Stores
            </Link>
          }
        />

        {isInitialLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
            Loading products...
          </div>
        ) : filteredItems.length ? (
          <div className="grid grid-cols-2 gap-2 min-w-0 sm:gap-3 md:grid-cols-3 md:gap-5 [&>*]:min-w-0">
            {filteredItems.map((item) => (
              <ProductCard
                key={listingDedupeKey(item)}
                product={item}
                href={item.storeUsername ? `/store/${item.storeUsername}` : undefined}
                openInModal={false}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
            No products or services match your search right now.
          </div>
        )}

        {!isInitialLoading && hasMore ? (
          <div ref={sentinelRef} className="py-6 text-center text-sm text-slate-500">
            {isFetchingMore ? 'Loading more products...' : 'Scroll to load more'}
          </div>
        ) : null}
      </div>
    </main>
  );
}
