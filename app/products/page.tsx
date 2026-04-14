'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/SectionHeader';
import ProductCard from '@/components/ProductCard';
import { getAllStores } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { prioritizeCurrentUserStore } from '@/src/lib/prioritize-user-store';
import type { Product, Service, Store } from '@/types';

type ListingItem = Product & {
  storeUsername?: string;
  whatsapp?: string;
};

export default function ProductsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const allStores = await getAllStores({ limit: 100 });
        setStores(allStores);
      } catch (error) {
        console.error('Failed to fetch products listing stores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const orderedStores = useMemo(() => prioritizeCurrentUserStore(stores, user), [stores, user]);

  const items = useMemo<ListingItem[]>(
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
    [orderedStores]
  );

  return (
    <main className="min-h-screen bg-white px-4 pt-3 pb-8 sm:px-6 sm:pt-10 sm:pb-12 lg:px-8 lg:pt-14 lg:pb-20">
      {/* Only when mobile quick-search panel is open — avoids permanent empty gap */}
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

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
            Loading products...
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-2 gap-2 min-w-0 sm:gap-3 md:grid-cols-3 md:gap-5 [&>*]:min-w-0">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                href={item.storeUsername ? `/store/${item.storeUsername}` : undefined}
                openInModal={false}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
            No products or services available right now.
          </div>
        )}
      </div>
    </main>
  );
}
