'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Star, ShoppingCart } from 'lucide-react';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  href?: string;
  openInModal?: boolean;
}

export default function ProductCard({ product, href, openInModal = true }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const displayPrice = product.price > 0 ? `₹${product.price}` : 'On request';

  const cardContent = (
    <div className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.35)]">
      <div className="relative overflow-hidden rounded-[20px] bg-gray-100">
        <div className="relative aspect-square">
          <Image src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-105" />
        </div>
        {discount > 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
            {discount}% off
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="font-semibold text-white">Out of stock</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0" />
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{product.rating > 0 ? product.rating.toFixed(1) : '0.0'}</span>
          </div>
        </div>

        <h3 className="mt-2 line-clamp-1 text-base font-semibold text-slate-950">{product.name}</h3>

        <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
          <p className="text-[1.15rem] font-bold leading-none text-slate-950">{displayPrice}</p>
          {product.originalPrice ? (
            <p className="text-xs font-medium text-slate-300 line-through">₹{product.originalPrice}</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {href && !openInModal ? (
        <Link href={href} className="group block overflow-hidden rounded-[28px] bg-transparent transition hover:shadow-xl">
          {cardContent}
        </Link>
      ) : (
        <div
          className="group flex cursor-pointer flex-col overflow-hidden rounded-[28px] bg-transparent transition hover:shadow-xl"
          onClick={() => setShowModal(true)}
        >
          {cardContent}
        </div>
      )}

      {openInModal && showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative h-72 md:h-full">
                <Image src={product.image} alt={product.name} fill className="object-cover" />
                {discount > 0 && (
                  <div className="absolute top-4 right-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-600">
                    {discount}% off
                  </div>
                )}
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{product.storeName}</p>
                  <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800">
                    x
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold">{product.rating}</span>
                    <span className="text-gray-500">({product.totalReviews})</span>
                  </div>
                  <span className={`text-xs font-semibold ${product.inStock ? 'text-emerald-600' : 'text-red-600'}`}>
                    {product.inStock ? 'In stock' : 'Back soon'}
                  </span>
                </div>
                <p className="line-clamp-4 text-sm leading-relaxed text-gray-600">{product.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">{displayPrice}</span>
                  {product.originalPrice ? (
                    <span className="text-lg text-gray-400 line-through">₹{product.originalPrice}</span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 font-semibold text-white">
                    <ShoppingCart className="h-4 w-4" />
                    Contact seller
                  </button>
                  <Link
                    href={`/product/${product.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border-2 border-gray-900 px-4 py-3 font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    View full details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
