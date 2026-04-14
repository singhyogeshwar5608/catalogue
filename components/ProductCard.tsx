'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
<<<<<<< HEAD
import { ArrowRight, ShoppingCart, Star } from 'lucide-react';
import { Product } from '@/types';

const CARD_BG = '#ffffff';
const MUTED = '#6b7280';
=======
import { Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { Product } from '@/types';

const CARD_BG = '#0B111B';
const ACCENT = '#FF9F29';
const MUTED = '#8E94A0';
>>>>>>> origin/main

interface ProductCardProps {
  product: Product;
  href?: string;
  openInModal?: boolean;
}

function buildGallery(product: Product): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (u: string | undefined | null) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };
  add(product.image);
  (product.images ?? []).forEach(add);
  return urls;
}

export default function ProductCard({ product, href, openInModal = true }: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);
<<<<<<< HEAD
=======
  const [qty, setQty] = useState(1);
>>>>>>> origin/main
  const gallery = useMemo(() => buildGallery(product), [product]);
  const [activeIndex, setActiveIndex] = useState(0);

  const heroSrc = gallery[activeIndex] ?? product.image;
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const displayPrice = product.price > 0 ? `₹${product.price}` : 'On request';
<<<<<<< HEAD
  const tagline = product.category || product.storeName || 'Best quality product';
  const brandInitial = (product.storeName?.trim()?.charAt(0) || 'B').toUpperCase();
  const badgeLabel = discount > 0 ? 'Best Seller' : 'Featured';
=======

  const maxThumbs = 3;
  const visibleThumbs = gallery.slice(0, maxThumbs);
  const moreCount = Math.max(0, gallery.length - maxThumbs);
  const categoryLabel = (product.category || 'Product').toUpperCase();
>>>>>>> origin/main

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const cardContent = (
    <div
<<<<<<< HEAD
      className="flex h-auto min-w-0 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white font-sans shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
      style={{ backgroundColor: CARD_BG }}
    >
      <div className="relative overflow-hidden">
        <div className="relative h-[45vw] max-h-[180px] w-full bg-slate-100 md:h-auto md:max-h-none md:aspect-[4/3]">
=======
      className="flex h-full min-w-0 flex-col rounded-[16px] p-2 font-sans shadow-none sm:rounded-[20px] sm:p-3.5 md:p-4"
      style={{ backgroundColor: CARD_BG }}
    >
      {/* Image area — white panel (wider aspect = shorter image vs card width) */}
      <div className="relative overflow-hidden rounded-[12px] bg-white sm:rounded-[15px]">
        <div className="relative aspect-[16/9] sm:aspect-[16/9] md:aspect-[2/1]">
>>>>>>> origin/main
          <Image
            src={heroSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
<<<<<<< HEAD
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-800 shadow-sm md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[10px]">
            {badgeLabel}
          </span>
          <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-800 shadow-sm md:right-3 md:top-3 md:h-8 md:w-8 md:text-xs">
            {brandInitial}
          </span>
        </div>
=======
            className="object-contain p-1.5 transition duration-300 group-hover:scale-[1.02] sm:p-2"
          />
        </div>
        {discount > 0 && (
          <div
            className="absolute left-1.5 top-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:left-2 sm:top-2 sm:px-2.5 sm:py-1 sm:text-[11px]"
            style={{
              backgroundColor: ACCENT,
              borderRadius: '10px 4px 10px 4px',
            }}
          >
            {discount}% off
          </div>
        )}
>>>>>>> origin/main
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="font-semibold text-white">Out of stock</span>
          </div>
        )}
<<<<<<< HEAD
        {gallery.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {gallery.slice(0, 5).map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={(e) => {
                  stop(e);
                  setActiveIndex(i);
                }}
                className={`h-1.5 w-1.5 rounded-full transition md:h-2 md:w-2 ${activeIndex === i ? 'bg-white' : 'bg-white/55'}`}
                aria-label={`Show image ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white p-3 md:p-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-slate-900 md:text-lg">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-slate-500 md:mt-1 md:text-sm">{tagline}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 md:mt-1 md:text-xs md:leading-relaxed">
          {product.description}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 md:mt-4">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-800 md:px-3 md:py-1 md:text-sm">
            {displayPrice}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white md:px-3.5 md:py-1.5 md:text-xs">
            Buy Now
            <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </span>
        </div>
=======
      </div>

      {/* Color / image variants */}
      {gallery.length > 1 ? (
        <div className="mt-2 flex items-center gap-1.5 sm:mt-3 sm:gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
            {visibleThumbs.map((src, i) => {
              const globalIdx = i;
              const selected = activeIndex === globalIdx;
              return (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={(e) => {
                    stop(e);
                    setActiveIndex(globalIdx);
                  }}
                  className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-white transition sm:h-9 sm:w-9"
                  style={{
                    boxShadow: selected ? `inset 0 0 0 2px ${ACCENT}` : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                  }}
                  aria-label={`Show image ${i + 1}`}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 640px) 28px, 36px" />
                </button>
              );
            })}
          </div>
          {moreCount > 0 ? (
            <span className="shrink-0 text-xs font-semibold tabular-nums sm:text-sm" style={{ color: ACCENT }}>
              + {moreCount}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 h-1 shrink-0 sm:mt-3" aria-hidden />
      )}

      <div className="mt-1.5 flex min-h-0 flex-1 flex-col sm:mt-2">
        <p className="text-[10px] font-medium uppercase tracking-wider sm:text-[11px]" style={{ color: MUTED }}>
          {categoryLabel}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-white sm:mt-1 sm:text-[15px]">
          {product.name}
        </h3>
        <p className="mt-1 text-base font-bold tabular-nums text-white sm:mt-2 sm:text-lg">{displayPrice}</p>
        {product.originalPrice ? (
          <p className="text-xs font-medium tabular-nums line-through opacity-50" style={{ color: MUTED }}>
            ₹{product.originalPrice}
          </p>
        ) : null}
      </div>

      {/* Quantity */}
      <div className="mt-2 flex items-center justify-start gap-1.5 sm:mt-3 sm:gap-2 md:mt-4">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={(e) => {
            stop(e);
            setQty((q) => Math.max(1, q - 1));
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white transition hover:bg-white/90 sm:h-9 sm:w-9"
        >
          <Minus className="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" strokeWidth={2.5} />
        </button>
        <span className="min-w-[1.25rem] text-center text-xs font-semibold tabular-nums text-white sm:text-sm">{qty}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={(e) => {
            stop(e);
            setQty((q) => Math.min(99, q + 1));
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white transition hover:bg-white/90 sm:h-9 sm:w-9"
        >
          <Plus className="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" strokeWidth={2.5} />
        </button>
>>>>>>> origin/main
      </div>
    </div>
  );

  return (
    <>
      {href && !openInModal ? (
        <Link
          href={href}
          className="group block h-full min-w-0 w-full overflow-hidden rounded-[16px] transition hover:opacity-[0.98] sm:rounded-[20px]"
        >
          {cardContent}
        </Link>
      ) : (
        <div
          className="group flex h-full min-w-0 w-full cursor-pointer flex-col overflow-hidden rounded-[16px] transition hover:opacity-[0.98] sm:rounded-[20px]"
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
                  <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-600">
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
<<<<<<< HEAD
=======
                  {product.originalPrice ? (
                    <span className="text-lg text-gray-400 line-through">₹{product.originalPrice}</span>
                  ) : null}
>>>>>>> origin/main
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
