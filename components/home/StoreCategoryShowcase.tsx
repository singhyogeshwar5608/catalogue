'use client';

import Link from 'next/link';
import { useRef, useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import VerifiedSellerCard from '@/components/VerifiedSellerCard';
import StoreCard from '@/components/StoreCard';
import type { Store } from '@/types';

type CategoryOption = {
  id: string;
  label: string;
  controlled?: boolean;
};

type StoreCategoryShowcaseProps = {
  stores: Store[];
  categories: CategoryOption[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
};

export default function StoreCategoryShowcase({ stores, categories, activeCategory, onSelectCategory }: StoreCategoryShowcaseProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const previewStores = stores.slice(0, 9);
  const mobilePreviewStores = previewStores.slice(0, 7);

  // Compute per-category position so each store in the same category
  // gets a different banner image (1st → image 0, 2nd → image 1, …).
  const storeCategoryIndex = useMemo(() => {
    const counters: Record<string, number> = {};
    const map = new Map<number | string, number>();
    previewStores.forEach((store) => {
      const key = String(store.category?.id ?? store.categoryName ?? '_');
      const idx = counters[key] ?? 0;
      map.set(store.id, idx);
      counters[key] = idx + 1;
    });
    return map;
  }, [previewStores]);
  const hasMoreStores = stores.length > 9;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -clientWidth : clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-8">
      <div className="relative -mx-4 px-4 py-[3%] sm:mx-0 sm:px-0 sm:py-0">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white via-white to-transparent sm:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white to-transparent sm:hidden" />
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 justify-start overflow-x-auto sm:flex-wrap sm:overflow-visible pl-8 pr-4 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        >
          {categories.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={`inline-flex items-center justify-center px-3 py-1.5 text-[0.82rem] sm:px-4 sm:py-2 sm:text-sm rounded-full border font-semibold transition whitespace-nowrap min-h-[2.5rem] ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
        <div className="sm:hidden absolute top-1/2 -translate-y-1/2 left-1 flex items-center">
          <button
            onClick={() => scroll('left')}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 bg-white text-slate-600 shadow"
            aria-label="Scroll categories left"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
        </div>
        <div className="sm:hidden absolute top-1/2 -translate-y-1/2 right-1 flex items-center">
          <button
            onClick={() => scroll('right')}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 bg-white text-slate-600 shadow"
            aria-label="Scroll categories right"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {stores.length ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 sm:hidden">
            {mobilePreviewStores.map((store, index) => {
              const chunkIndex = index % 7;
              const isFullWidth = chunkIndex === 0;

              if (isFullWidth) {
                return (
                  <div key={store.id} className="col-span-2">
                    <VerifiedSellerCard store={store} categoryBannerIndex={storeCategoryIndex.get(store.id) ?? 0} />
                  </div>
                );
              }

              return (
                <div key={store.id} className="col-span-1 min-w-0">
                  <StoreCard store={store} isCompact categoryBannerIndex={storeCategoryIndex.get(store.id) ?? 0} />
                </div>
              );
            })}
          </div>

          {hasMoreStores ? (
            <div className="mt-[10%] flex justify-center sm:hidden">
              <Link
                href="/all-stores"
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                All Stores
              </Link>
            </div>
          ) : null}

          <div className="hidden grid-cols-1 gap-6 sm:grid md:grid-cols-2 lg:grid-cols-3">
            {previewStores.map((store) => (
              <VerifiedSellerCard key={store.id} store={store} categoryBannerIndex={storeCategoryIndex.get(store.id) ?? 0} />
            ))}
          </div>
          {hasMoreStores ? (
            <div className="hidden justify-center sm:flex">
              <Link
                href="/all-stores"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                All Stores
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-3xl">
          <p className="text-xl font-semibold text-slate-900">No stores in this category yet</p>
          <p className="text-slate-500 mt-2">Try switching categories to explore other sellers.</p>
        </div>
      )}
    </div>
  );
}
