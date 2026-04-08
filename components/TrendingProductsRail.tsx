'use client';

import Link from 'next/link';
import type { Product } from '@/types';
import ProductCard from '@/components/ProductCard';

type TrendingProduct = Product & {
  storeUsername?: string;
};

type TrendingProductsRailProps = {
  products: TrendingProduct[];
};

export default function TrendingProductsRail({ products }: TrendingProductsRailProps) {
  const mobileProducts = products.slice(0, 4);
  const desktopProducts = products.slice(0, 6);

  if (!products.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-5 py-10 text-center text-sm font-medium text-slate-500">
        No products available right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:hidden">
        {mobileProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            href={product.storeUsername ? `/store/${product.storeUsername}` : undefined}
            openInModal={false}
          />
        ))}
      </div>

      <div className="hidden grid-cols-3 gap-6 sm:grid">
        {desktopProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            href={product.storeUsername ? `/store/${product.storeUsername}` : undefined}
            openInModal={false}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Link
          href="/products"
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          View All Products
        </Link>
      </div>
    </div>
  );
}
