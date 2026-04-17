'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import DynamicBanner from '@/components/DynamicBanner';
import {
  BadgeCheck,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Facebook,
  Instagram,
  Linkedin,
  Menu,
  X,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Check,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  Briefcase,
  Layers,
  Youtube,
  Minus,
  Plus,
  Heart,
  UserPlus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Smile,
  Zap,
  ThumbsUp,
  Tag,
} from 'lucide-react';
import type {
  Store,
  Product,
  ProductUnitType,
  Review,
  Service,
  ServiceBillingUnit,
  RatingSummary,
  ReviewPagination,
  ProductCheckoutPublic,
} from '@/types';
import RatingStars from '@/components/RatingStars';
import ReviewCard from '@/components/ReviewCard';
import { useAuth } from '@/src/context/AuthContext';
import { getThemeForCategory, type ReviewTheme } from '@/src/lib/reviewTheme';
import {
  getProductById,
  createProductCheckoutRazorpayOrder,
  verifyProductCheckoutRazorpayPayment,
  isApiError,
} from '@/src/lib/api';
import { loadRazorpayCheckoutScript } from '@/src/lib/razorpayCheckoutScript';
import { checkoutQrImageSrc } from '@/src/lib/checkoutAssetUrl';
import { ratingBreakdownFromSummaryOrReviews } from '@/src/lib/reviewRatingBreakdown';
// Demo catalog items removed: stores should show products only after upload.

const FALLBACK_PRODUCT_IMAGE = '/fallback/product-placeholder.svg';
const DEMO_PRODUCT_CTA_IMAGE = '/demo/upload-product-cta.png';
const OWNER_NO_PRODUCTS_PLACEHOLDER_IMAGE =
  'https://res.cloudinary.com/drcfeoi6p/image/upload/v1776249845/11111-removebg-preview_a2qqe4.png';

type StoreViewProps = {
  store: Store;
  products: Product[];
  services: Service[];
  reviews: Review[];
  reviewSummary?: RatingSummary;
  reviewPagination?: ReviewPagination;
  reviewsLoading?: boolean;
  reviewsError?: string | null;
  onLoadMoreReviews?: () => void;
  onSubmitStoreReview?: (payload: { rating: number; comment: string }) => Promise<void>;
  onToggleFollow?: () => Promise<void> | void;
  onToggleLike?: () => Promise<void> | void;
  followBusy?: boolean;
  likeBusy?: boolean;
  isEditMode?: boolean;
  onEnterEdit?: () => void;
  onInlineLogoEdit?: () => void;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
  onLocationChange?: (location: string) => void;
  onAddProductShortcut?: () => void;
};

const buildSocialLinks = (store: Store) => {
  const links = [
    {
      label: 'Facebook',
      href: store.socialLinks?.facebook,
      icon: Facebook,
      className: 'border-[#1877F2]/40 bg-[#1877F2] text-white hover:bg-[#1664d9]',
    },
    {
      label: 'Instagram',
      href: store.socialLinks?.instagram,
      icon: Instagram,
      className:
        'border-transparent bg-[linear-gradient(135deg,#f58529_0%,#feda77_18%,#dd2a7b_48%,#8134af_76%,#515bd4_100%)] text-white hover:brightness-110',
    },
    {
      label: 'YouTube',
      href: store.socialLinks?.youtube,
      icon: Youtube,
      className: 'border-[#FF0000]/40 bg-[#FF0000] text-white hover:bg-[#e00000]',
    },
    {
      label: 'LinkedIn',
      href: store.socialLinks?.linkedin,
      icon: Linkedin,
      className: 'border-[#0A66C2]/40 bg-[#0A66C2] text-white hover:bg-[#0958a7]',
    },
  ].filter((item) => Boolean(item.href));

  return links;
};

const MAX_CART_ITEMS = 20;

const PRODUCT_UNIT_LABELS: Record<ProductUnitType, string> = {
  piece: 'piece',
  box: 'box',
  pack: 'pack',
  set: 'set',
  kilogram: 'kg',
  gram: 'g',
  liter: 'litre',
  milliliter: 'ml',
  meter: 'meter',
  centimeter: 'cm',
  square_meter: 'sq. meter',
  custom: 'unit',
};

const SERVICE_BILLING_LABELS: Record<ServiceBillingUnit, string> = {
  session: 'per session',
  hour: 'per hour',
  day: 'per day',
  week: 'per week',
  month: 'per month',
  project: 'per project',
  custom: 'custom billing',
};

const formatProductUnitLabel = (product: Product) => {
  const baseLabel = product.unitCustomLabel?.trim() || PRODUCT_UNIT_LABELS[product.unitType ?? 'piece'];
  if (!product.unitQuantity || product.unitQuantity === 1) {
    return baseLabel;
  }
  return `${product.unitQuantity} ${baseLabel}${product.unitQuantity > 1 ? 's' : ''}`;
};

const formatPriceUnitLabel = (product: Product) => {
  const baseLabel = product.unitCustomLabel?.trim() || PRODUCT_UNIT_LABELS[product.unitType ?? 'piece'];
  if (!baseLabel) return '';
  return baseLabel.charAt(0).toUpperCase() + baseLabel.slice(1);
};

const formatServiceBillingLabel = (service: Service) => {
  if (service.billingUnit === 'custom') {
    return service.customBillingUnit?.trim() || 'Custom package';
  }
  if (service.billingUnit) {
    return SERVICE_BILLING_LABELS[service.billingUnit];
  }
  return 'Flexible billing';
};

const formatCurrencyDisplay = (value: number) => {
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
};

function buildProductGallery(product: Product): string[] {
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

const ProductImageCarousel = ({
  products,
  services,
  isStoreOwner,
}: {
  products: Product[];
  services: Service[];
  isStoreOwner: boolean;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightbox, setLightbox] = useState<{ images: string[]; title: string } | null>(null);

  type HeroCarouselItem =
    | { type: 'placeholder' }
    | { type: 'product'; data: Product }
    | { type: 'service'; data: Service };

  const combinedItems = useMemo((): HeroCarouselItem[] => {
    const items: HeroCarouselItem[] = [];
    const prodList = products ?? [];
    if (prodList.length === 0) {
      items.push({ type: 'placeholder' });
    }
    prodList.forEach((product) => items.push({ type: 'product', data: product }));
    (services ?? []).forEach((service) => items.push({ type: 'service', data: service }));
    return items;
  }, [products, services]);

  useEffect(() => {
    if (!combinedItems.length) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % combinedItems.length);
    }, 3200);

    return () => clearInterval(interval);
  }, [combinedItems.length]);

  useEffect(() => {
    if (currentIndex >= combinedItems.length && combinedItems.length > 0) {
      setCurrentIndex(0);
    }
  }, [combinedItems.length, currentIndex]);

  if (!combinedItems.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-6 py-10 text-center text-white/70">
        No products or services available yet.
      </div>
    );
  }

  return (
    <>
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
      <div className="relative aspect-square md:aspect-[4/3]">
        {combinedItems.map((item, index) => {
          if (item.type === 'placeholder') {
            return (
              <motion.div
                key="hero-carousel-placeholder"
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{
                  opacity: index === currentIndex ? 1 : 0,
                  scale: index === currentIndex ? 1 : 1.02,
                }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                {isStoreOwner ? (
                  <Link
                    href="/dashboard/products"
                    prefetch
                    className="absolute inset-0 block cursor-pointer text-left"
                    aria-label="Add products in dashboard"
                  >
                    <Image
                      src={OWNER_NO_PRODUCTS_PLACEHOLDER_IMAGE}
                      alt=""
                      fill
                      className="rounded-[28px] bg-white object-contain p-6"
                      sizes="(max-width: 640px) 100vw, 512px"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-3 pb-4 pt-12">
                      <p className="text-center text-[13px] font-semibold text-white">
                        Upload your first products here — Add products
                      </p>
                    </div>
                  </Link>
                ) : (
                  <>
                    <Image
                      src={OWNER_NO_PRODUCTS_PLACEHOLDER_IMAGE}
                      alt=""
                      fill
                      className="rounded-[28px] bg-white object-contain p-6"
                      sizes="(max-width: 640px) 100vw, 512px"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-3 pb-4 pt-12">
                      <p className="text-center text-[13px] font-semibold text-white">
                        No products yet — check back soon
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            );
          }

          const isDemoProduct =
            item.type === 'product' && typeof item.data.id === 'string'
              ? item.data.id.startsWith('demo')
              : false;
          const itemTitle = item.type === 'product' ? item.data.name : item.data.title;
          const hasImage = Boolean(item.data.image);
          const heroImage = isDemoProduct ? DEMO_PRODUCT_CTA_IMAGE : item.data.image;
          const galleryImages =
            item.type === 'product'
              ? buildProductGallery(item.data)
              : heroImage
                ? [heroImage]
                : [];

          return (
            <motion.div
              key={`${item.type}-${item.data.id}`}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                opacity: index === currentIndex ? 1 : 0,
                scale: index === currentIndex ? 1 : 1.02,
              }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
              {hasImage ? (
                isDemoProduct && isStoreOwner ? (
                  <Link
                    href="/dashboard/products"
                    prefetch
                    className="absolute inset-0 block cursor-pointer text-left"
                    aria-label="Upload product"
                  >
                    <Image
                      src={heroImage}
                      alt={itemTitle}
                      fill
                      className="rounded-[28px] bg-white object-contain"
                      sizes="(max-width: 640px) 100vw, 512px"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-white/50" />
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <span className="relative z-10 rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white shadow-sm">Upload Product</span>
                    </div>
                  </Link>
                ) : (
                <button
                  type="button"
                  className="absolute inset-0 block cursor-pointer border-0 bg-transparent p-0 text-left"
                  aria-label={`View ${itemTitle} images`}
                  onClick={() => {
                    if (galleryImages.length > 0) {
                      setLightbox({ images: galleryImages, title: itemTitle });
                    }
                  }}
                >
                  <Image
                    src={heroImage}
                    alt={itemTitle}
                    fill
                    className="rounded-[28px] bg-white object-contain"
                    sizes="(max-width: 640px) 100vw, 512px"
                  />
                </button>
                )
              ) : (
                <div className="absolute inset-0 flex h-full w-full items-center justify-center rounded-[28px] bg-gradient-to-br from-slate-800 to-slate-900 text-white/50">
                  <Layers className="h-12 w-12" aria-hidden />
                </div>
              )}
            </motion.div>
          );
        })}
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {combinedItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 rounded-full transition-all ${index === currentIndex ? 'w-6 bg-white shadow-md' : 'w-1.5 bg-white/60'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
    <StoreMediaLightbox
      open={lightbox != null}
      images={lightbox?.images ?? []}
      initialIndex={0}
      title={lightbox?.title ?? ''}
      onClose={() => setLightbox(null)}
    />
    </>
  );
};

/** Desktop-only (lg+): one product at a time in the hero card, auto-advances with horizontal slide. */
const HERO_DESKTOP_CAROUSEL_INTERVAL_MS = 4200;

function HeroDesktopProductMarquee({
  products,
  storeUsername,
  isStoreOwner,
}: {
  products: Product[];
  storeUsername: string;
  isStoreOwner: boolean;
}) {
  const slides = useMemo(() => {
    const list: { id: string | number; name: string; image: string }[] = [];
    for (const p of products) {
      const img = p.image?.trim() || buildProductGallery(p)[0];
      if (!img) continue;
      list.push({ id: p.id, name: p.name, image: img });
    }
    return list;
  }, [products]);

  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(280);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      if (w > 0) setFrameWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const slideIdsKey = useMemo(() => slides.map((s) => String(s.id)).join(','), [slides]);

  useEffect(() => {
    setActiveIndex(0);
  }, [slideIdsKey]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, HERO_DESKTOP_CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slides.length, slideIdsKey]);

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  if (products.length === 0) {
    return (
      <div className="w-full max-w-lg shrink-0 overflow-hidden rounded-3xl border border-white/20 bg-slate-950/70 p-5 text-left text-white/90 shadow-[0_30px_120px_rgba(2,6,23,0.62)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">Products</p>
        <div className="relative mt-3 h-[260px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white shadow-inner">
          {isStoreOwner ? (
            <Link
              href="/dashboard/products"
              prefetch
              className="relative block h-full w-full"
              aria-label="Add products in dashboard"
            >
              <Image
                src={OWNER_NO_PRODUCTS_PLACEHOLDER_IMAGE}
                alt=""
                fill
                className="object-contain p-5"
                sizes="512px"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-3 pt-10">
                <p className="text-center text-[12px] font-semibold leading-snug text-white">
                  Upload your first products here.{' '}
                  <span className="underline decoration-white/50 underline-offset-2">Add products</span>
                </p>
              </div>
            </Link>
          ) : (
            <>
              <Image
                src={OWNER_NO_PRODUCTS_PLACEHOLDER_IMAGE}
                alt=""
                fill
                className="object-contain p-5"
                sizes="512px"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-3 pt-8">
                <p className="line-clamp-2 text-center text-[12px] font-semibold leading-snug text-white">
                  No products yet — check back soon
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!slides.length) return null;

  const trackWidthPx = slides.length * frameWidth;

  return (
    <div className="w-full max-w-lg shrink-0 overflow-hidden rounded-3xl border border-white/20 bg-slate-950/70 p-5 text-left text-white/90 shadow-[0_30px_120px_rgba(2,6,23,0.62)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.4em] text-white/60">Products</p>
      <div ref={viewportRef} className="relative mt-3 h-[260px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-inner">
        <motion.div
          className="flex h-full"
          animate={{ x: -activeIndex * frameWidth }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: trackWidthPx }}
        >
          {slides.map((s) => (
            <div key={`hero-desk-slide-${String(s.id)}`} className="shrink-0" style={{ width: frameWidth }}>
              <Link
                href={`/store/${encodeURIComponent(storeUsername)}#products`}
                className="relative block h-full w-full overflow-hidden no-underline outline-none ring-offset-2 ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-white/70"
                scroll
                aria-label={`View ${s.name} in catalog`}
              >
                <img
                  src={s.image}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-3 pt-8">
                  <p className="line-clamp-2 text-center text-[12px] font-semibold leading-snug text-white">{s.name}</p>
                </div>
              </Link>
            </div>
          ))}
        </motion.div>
      </div>
      {slides.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Product slides">
          {slides.map((_, i) => (
            <button
              key={`hero-desk-dot-${i}`}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Show product ${i + 1}`}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-7 bg-white shadow-sm' : 'w-1.5 bg-white/35 hover:bg-white/55'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type CartEntry = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

const loadImageSafely = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof window === 'undefined' || !src) {
      resolve(null);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const createCartSnapshotBlob = async (store: Store, entries: CartEntry[], cartTotal: number) => {
  if (typeof document === 'undefined') {
    throw new Error('Snapshot can only be created in the browser');
  }
  const width = 720;
  const padding = 32;
  const rowHeight = 110;
  const headerHeight = 120;
  const footerHeight = 120;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = padding * 2 + headerHeight + footerHeight + rowHeight * entries.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cardX = padding;
  const cardY = padding;
  const cardWidth = width - padding * 2;
  const cardHeight = canvas.height - padding * 2;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 28);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = '600 24px "Inter", "Arial", sans-serif';
  ctx.fillText('CART', cardX + 24, cardY + 40);
  ctx.font = '400 14px "Inter", "Arial", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Saved items (${entries.length})`, cardX + 24, cardY + 66);

  let currentY = cardY + headerHeight;

  for (const entry of entries) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 24, currentY - 12);
    ctx.lineTo(cardX + cardWidth - 24, currentY - 12);
    ctx.stroke();

    const image = await loadImageSafely(entry.image);
    const imageSize = 72;
    const imageX = cardX + 24;
    const imageY = currentY;
    if (image) {
      ctx.save();
      drawRoundedRect(ctx, imageX, imageY, imageSize, imageSize, 16);
      ctx.clip();
      ctx.drawImage(image, imageX, imageY, imageSize, imageSize);
      ctx.restore();
    } else {
      ctx.fillStyle = '#cbd5f5';
      drawRoundedRect(ctx, imageX, imageY, imageSize, imageSize, 16);
      ctx.fill();
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 18px "Inter", "Arial", sans-serif';
    ctx.fillText(entry.name, imageX + imageSize + 16, imageY + 24);
    ctx.font = '400 14px "Inter", "Arial", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`₹${formatCurrency(entry.price)} each`, imageX + imageSize + 16, imageY + 48);

    ctx.fillStyle = '#475569';
    ctx.fillText(`Qty: ${entry.quantity}`, imageX + imageSize + 16, imageY + 70);

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 18px "Inter", "Arial", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`₹${formatCurrency(entry.price * entry.quantity)}`, cardX + cardWidth - 24, imageY + 40);
    ctx.textAlign = 'left';

    currentY += rowHeight;
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(cardX + 24, currentY);
  ctx.lineTo(cardX + cardWidth - 24, currentY);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '500 16px "Inter", "Arial", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Cart total', cardX + 24, currentY + 40);
  ctx.font = '700 24px "Inter", "Arial", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'right';
  ctx.fillText(`₹${formatCurrency(cartTotal)}`, cardX + cardWidth - 24, currentY + 40);
  ctx.textAlign = 'left';

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Unable to create cart snapshot'));
      }
    }, 'image/png');
  });
};

type Theme = ReviewTheme;

const fadeInVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

// (QR rendering removed from the hero avatar: the store logo should always be shown.)

type HeroSectionProps = {
  store: Store;
  heroProduct?: Product;
  theme: Theme;
  whatsappLink: string;
  products: Product[];
  services: Service[];
  isProPlan: boolean;
  isStoreOwner: boolean;
  canEngage: boolean;
  onToggleFollow?: () => Promise<void> | void;
  onToggleLike?: () => Promise<void> | void;
  followBusy?: boolean;
  likeBusy?: boolean;
};

const HeroSection = ({
  store,
  heroProduct,
  theme,
  whatsappLink,
  products,
  services,
  isProPlan,
  isStoreOwner,
  canEngage,
  onToggleFollow,
  onToggleLike,
  followBusy = false,
  likeBusy = false,
}: HeroSectionProps) => {
  const socialLinks = buildSocialLinks(store);
  const heroGradient = `linear-gradient(135deg, ${theme.primary}33 0%, ${theme.accent}55 35%, transparent 70%)`;

  // Owners can like/follow their own store once (no undo).
  const ownerFollowLocked = isStoreOwner && Boolean(store.viewerFollowing);
  const ownerLikeLocked = isStoreOwner && Boolean(store.viewerLiked);

  // QR download/share actions removed from the hero avatar to avoid masking the store logo for owners.

  return (
    <div className="pt-0">
      <div className="relative">
        <DynamicBanner
          category={store.category}
          storeId={Number(store.id)}
          storeName={store.name}
          storeBannerImage={store.storeBannerImage}
          resolvedBannerImage={store.banner}
        />

        <section
          id="home"
          className="absolute inset-0 z-20 flex flex-col gap-4 px-3.5 pt-1.5 pb-3 text-white sm:gap-6 sm:px-6 sm:pt-16 sm:pb-4 lg:flex-row lg:items-stretch lg:justify-between lg:gap-8 lg:px-10 lg:pt-14 lg:pb-6"
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 sm:gap-6 lg:h-full">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mx-auto w-[95%] max-w-3xl text-center sm:mx-0 sm:w-full sm:text-left"
          >
            <motion.div
              variants={fadeInVariants}
              className="flex min-h-[305px] flex-col items-center gap-3.5 rounded-3xl bg-black/30 px-3.5 py-4 backdrop-blur-md sm:min-h-0 sm:flex-row sm:items-center sm:px-4 sm:py-4"
            >
              <span className="relative inline-flex items-center">
                <span className="relative inline-flex h-[3.9rem] w-[3.9rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white/95 p-1.5 shadow-xl sm:h-[4.6rem] sm:w-[4.6rem]">
                  {/* Always show the store's uploaded logo (even for the owner). */}
                  <img
                    src={store.logo}
                    alt={`${store.name} logo`}
                    width={74}
                    height={74}
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </span>
                {(store.isVerified || isProPlan) && (
                  <span
                    className="absolute right-0 top-0 inline-flex translate-x-1/2 -translate-y-1/2 items-center justify-center bg-sky-500 p-2 text-white shadow-xl ring-2 ring-white"
                    style={{
                      clipPath:
                        'polygon(50% 0%, 61% 12%, 78% 5%, 83% 22%, 100% 28%, 88% 44%, 100% 60%, 83% 66%, 78% 83%, 61% 76%, 50% 88%, 39% 76%, 22% 83%, 17% 66%, 0% 60%, 12% 44%, 0% 28%, 17% 22%, 22% 5%, 39% 12%)',
                    }}
                  >
                    {isProPlan ? (
                      <span className="text-[10px] font-bold uppercase">Pro</span>
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </span>
                )}
              </span>
              <motion.div variants={fadeInVariants} className="relative min-w-0 flex-1 text-center sm:text-left">
                <h1 className="text-xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">{store.name}</h1>
                {isProPlan && (
                  <span className="mt-3 inline-flex items-center gap-1 self-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-lg sm:self-start">
                    Pro Store
                  </span>
                )}
                <div className="mt-2.5 flex flex-col items-center gap-1 text-[9px] text-white/80 sm:hidden">
                  <div className="flex flex-wrap justify-center gap-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      <span className="font-medium">{store.location}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 text-amber-300" />
                      <span>{store.rating} · {store.totalReviews}+ reviews</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 text-center text-white/80">
                    <span className="inline-flex items-center gap-1 font-semibold text-white">
                      <BadgeCheck className="h-2.5 w-2.5 text-primary" />
                      {store.name}
                    </span>
                    {store.showPhone !== false && (
                      <span className="inline-flex items-center gap-1 text-white">
                        <Phone className="h-2.5 w-2.5" />
                        <span>{store.whatsapp}</span>
                      </span>
                    )}
                  </div>
                </div>
                {socialLinks.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2 pt-2 sm:justify-start">
                    {socialLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.label}
                          href={item.href as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_12px_24px_-16px_rgba(15,23,42,0.65)] transition hover:-translate-y-0.5 ${item.className}`}
                          aria-label={item.label}
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 w-full sm:hidden">
                  <ProductImageCarousel products={products} services={services} isStoreOwner={isStoreOwner} />
                </div>

                <div className="mt-2.5 grid w-full grid-cols-3 gap-2 text-slate-900 sm:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEngage || followBusy || !onToggleFollow) return;
                      if (ownerFollowLocked) return;
                      void onToggleFollow();
                    }}
                    disabled={!canEngage || followBusy || !onToggleFollow || ownerFollowLocked}
                    className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      store.viewerFollowing
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-md hover:bg-emerald-700'
                        : 'border-slate-200 bg-white/95 text-slate-900 hover:bg-emerald-50/80'
                    }`}
                    aria-label={store.viewerFollowing ? 'Following store' : 'Follow store'}
                  >
                    <p className={`text-[12px] font-semibold tabular-nums ${store.viewerFollowing ? 'text-white' : 'text-slate-900'}`}>
                      {(store.followersCount ?? 0).toLocaleString('en-IN')}
                    </p>
                    <p className={`mt-0.5 inline-flex items-center gap-1 text-[9px] font-medium ${store.viewerFollowing ? 'text-white/90' : 'text-slate-500'}`}>
                      {followBusy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <UserPlus className="h-2.5 w-2.5" />}
                      {store.viewerFollowing ? 'Following' : 'Follow'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEngage || likeBusy || !onToggleLike) return;
                      if (ownerLikeLocked) return;
                      void onToggleLike();
                    }}
                    disabled={!canEngage || likeBusy || !onToggleLike || ownerLikeLocked}
                    className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      store.viewerLiked
                        ? 'border-red-600 bg-red-600 text-white shadow-md hover:bg-red-700'
                        : 'border-slate-200 bg-white/95 text-slate-900 hover:bg-rose-50/80'
                    }`}
                    aria-label={store.viewerLiked ? 'Liked store' : 'Like store'}
                  >
                    <p className={`text-[12px] font-semibold tabular-nums ${store.viewerLiked ? 'text-white' : 'text-slate-900'}`}>
                      {(store.likesCount ?? 0).toLocaleString('en-IN')}
                    </p>
                    <p className={`mt-0.5 inline-flex items-center gap-1 text-[9px] font-medium ${store.viewerLiked ? 'text-white/90' : 'text-slate-500'}`}>
                      {likeBusy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Heart className="h-2.5 w-2.5" />}
                      {store.viewerLiked ? 'Liked' : 'Like'}
                    </p>
                  </button>
                  <div className="flex min-h-[48px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white/95 px-1 py-1.5 text-center shadow-sm">
                    <p className="text-[12px] font-semibold tabular-nums text-slate-900">
                      {(store.seenCount ?? 0).toLocaleString('en-IN')}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-medium text-slate-500">
                      <Eye className="h-2.5 w-2.5" />
                      Seen
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeInVariants}
            className="hidden sm:block w-full max-w-lg rounded-3xl border border-white/20 bg-slate-950/70 p-5 text-left text-white/90 shadow-[0_30px_120px_rgba(2,6,23,0.62)] backdrop-blur"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Store address</p>
            <div className="mt-2 flex items-center gap-3 text-2xl font-semibold text-white">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span className="break-words overflow-wrap-anywhere">{store.location}</span>
            </div>
            <p className="mt-2 text-sm text-white/70 break-words">{store.shortDescription || `${store.businessType} specialist, trusted across ${store.totalReviews}+ customers.`}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-300 flex-shrink-0" />
                <span className="break-words">{store.rating} · {store.totalReviews}+ reviews</span>
              </div>
              {store.showPhone !== false && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">{store.whatsapp}</span>
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-slate-900">
              <button
                type="button"
                onClick={() => {
                  if (!canEngage || followBusy || !onToggleFollow) return;
                  if (ownerFollowLocked) return;
                  void onToggleFollow();
                }}
                disabled={!canEngage || followBusy || !onToggleFollow || ownerFollowLocked}
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  store.viewerFollowing
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md hover:bg-emerald-700'
                    : 'border-slate-200 bg-white/95 text-slate-900 hover:bg-emerald-50'
                }`}
                aria-label={store.viewerFollowing ? 'Following store' : 'Follow store'}
              >
                <p className={`text-sm font-semibold tabular-nums ${store.viewerFollowing ? 'text-white' : 'text-slate-900'}`}>
                  {(store.followersCount ?? 0).toLocaleString('en-IN')}
                </p>
                <p className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium ${store.viewerFollowing ? 'text-white/90' : 'text-slate-600'}`}>
                  {followBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                  {store.viewerFollowing ? 'Following' : 'Follow'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canEngage || likeBusy || !onToggleLike) return;
                  if (ownerLikeLocked) return;
                  void onToggleLike();
                }}
                disabled={!canEngage || likeBusy || !onToggleLike || ownerLikeLocked}
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  store.viewerLiked
                    ? 'border-red-600 bg-red-600 text-white shadow-md hover:bg-red-700'
                    : 'border-slate-200 bg-white/95 text-slate-900 hover:bg-rose-50'
                }`}
                aria-label={store.viewerLiked ? 'Liked store' : 'Like store'}
              >
                <p className={`text-sm font-semibold tabular-nums ${store.viewerLiked ? 'text-white' : 'text-slate-900'}`}>
                  {(store.likesCount ?? 0).toLocaleString('en-IN')}
                </p>
                <p className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium ${store.viewerLiked ? 'text-white/90' : 'text-slate-600'}`}>
                  {likeBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Heart className="h-3 w-3" />}
                  {store.viewerLiked ? 'Liked' : 'Like'}
                </p>
              </button>
              <div className="flex min-h-[52px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white/95 px-1 py-1.5 text-center shadow-sm">
                <p className="text-sm font-semibold tabular-nums text-slate-900">
                  {(store.seenCount ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-slate-600">
                  <Eye className="h-3 w-3" />
                  Seen
                </p>
              </div>
            </div>
            <div className="mt-6 hidden sm:flex justify-center">
              <a
                href={`https://wa.me/?text=Hi%20${encodeURIComponent(store.name)}%2C%20I'm%20interested%20in%20your%20products.%20Here's%20your%20store%20catalogue%3A%20${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] transition hover:-translate-y-0.5 hover:bg-blue-500 sm:px-8 sm:text-base"
              >
                Share Catalogue Link
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
          </div>

          <div className="hidden shrink-0 self-center lg:block">
            <HeroDesktopProductMarquee
              products={products}
              storeUsername={store.username}
              isStoreOwner={isStoreOwner}
            />
          </div>
        </section>
      </div>
      <motion.div variants={fadeInVariants} className="relative z-20 mt-16 mb-20 flex justify-center px-4 sm:hidden">
        <a
          href={`https://wa.me/?text=Hi%20${encodeURIComponent(store.name)}%2C%20I'm%20interested%20in%20your%20products.%20Here's%20your%20store%20catalogue%3A%20${encodeURIComponent(window.location.href)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] transition hover:-translate-y-0.5 hover:bg-blue-500 sm:px-8 sm:text-base"
        >
          Share Catalogue Link
          <ArrowRight className="h-4 w-4" />
        </a>
      </motion.div>

    </div>
  );
};

const getDiscountPercent = (price?: number, original?: number) => {
  if (!price || !original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
};

const CATALOG_CARD_BG = '#0B111B';
const CATALOG_ACCENT = '#FF9F29';
const CATALOG_MUTED = '#8E94A0';

/** Full-screen image viewer for store catalog (no navigation away from the store page). */
function StoreMediaLightbox({
  open,
  images,
  initialIndex,
  title,
  onClose,
}: {
  open: boolean;
  images: string[];
  initialIndex: number;
  title: string;
  onClose: () => void;
}) {
  const list = useMemo(
    () => images.filter((u): u is string => typeof u === 'string' && u.trim().length > 0),
    [images]
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    const filtered = images.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
    if (!filtered.length) return;
    const clamped = Math.max(0, Math.min(initialIndex, filtered.length - 1));
    setIdx(clamped);
  }, [open, initialIndex, images]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(list.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, list.length]);

  const src = list[idx];
  if (!open || typeof document === 'undefined' || !src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Image: ${title}` : 'Image preview'}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed left-3 top-3 z-[222] rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 sm:left-auto sm:right-5 sm:top-5 sm:px-5 sm:py-2.5"
        aria-label="Close image"
      >
        Close
      </button>
      {list.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => Math.max(0, i - 1));
            }}
            className="fixed left-2 top-1/2 z-[221] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:bg-black/80 sm:left-4 sm:h-14 sm:w-14"
          >
            <ChevronLeft className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => Math.min(list.length - 1, i + 1));
            }}
            className="fixed right-2 top-1/2 z-[221] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:bg-black/80 sm:right-4 sm:h-14 sm:w-14"
          >
            <ChevronRight className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
        </>
      ) : null}
      <div
        className="flex h-[min(88vh,920px)] w-[min(96vw,1280px)] max-w-full flex-col overflow-hidden rounded-2xl bg-neutral-950/80 shadow-2xl ring-1 ring-white/10 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex min-h-[52vh] w-full flex-1 basis-0 bg-black/50 sm:min-h-[56vh]">
          <Image
            src={src}
            alt={title}
            fill
            className="object-contain p-4 sm:p-8 md:p-12"
            sizes="(max-width: 768px) 96vw, 1280px"
            priority
          />
        </div>
        <div className="shrink-0 border-t border-white/10 bg-black/40 px-4 py-3 sm:px-6 sm:py-4">
          {title ? (
            <p className="text-center text-sm font-semibold text-white sm:text-base md:text-lg">{title}</p>
          ) : null}
          {list.length > 1 ? (
            <p className="mt-1 text-center text-xs text-white/50 sm:text-sm">
              {idx + 1} / {list.length}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

const BUY_MODAL_MAX_QTY = 99;

type BuyNowProductModalProps = {
  product: Product;
  quantity: number;
  storeName: string;
  /** Logged-in visitor owns this storefront. */
  isStoreOwner: boolean;
  onClose: () => void;
  onQuantityChange: (next: number) => void;
  onAddToCart: (qty: number) => void;
};

function BuyNowProductModal({
  product,
  quantity,
  storeName,
  isStoreOwner,
  onClose,
  onQuantityChange,
  onAddToCart,
}: BuyNowProductModalProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [checkout, setCheckout] = useState<ProductCheckoutPublic | null>(null);
  const [checkoutLoadError, setCheckoutLoadError] = useState<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);
  const qrSectionRef = useRef<HTMLDivElement | null>(null);
  const gallery = useMemo(() => buildProductGallery(product), [product]);
  const heroSrc = gallery[heroIndex] ?? product.image;
  const discount = getDiscountPercent(product.price, product.originalPrice);
  const categoryLabel = (product.category || 'General').toUpperCase();
  const unitLabel = formatPriceUnitLabel(product);
  const unitDetail = formatProductUnitLabel(product);
  const addDisabled = !product.inStock;
  const lineTotal = useMemo(() => product.price * quantity, [product.price, quantity]);
  const canPayOnline = Boolean(checkout?.onlinePaymentAvailable);
  const canPayQr = Boolean(checkout?.qrPaymentAvailable && checkout?.paymentQrUrl);
  const hasAnyPayment = canPayOnline || canPayQr;

  useEffect(() => {
    setHeroIndex(0);
    setAddSuccessMessage(null);
  }, [product.id]);

  useEffect(() => {
    let cancelled = false;
    setCheckoutLoading(true);
    setCheckoutLoadError(null);
    getProductById(product.id)
      .then(({ checkout: nextCheckout }) => {
        if (!cancelled) setCheckout(nextCheckout);
      })
      .catch((err) => {
        if (!cancelled) {
          setCheckoutLoadError(isApiError(err) ? err.message : 'Could not load payment options');
        }
      })
      .finally(() => {
        if (!cancelled) setCheckoutLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id, isStoreOwner]);

  const startRazorpayCheckout = async () => {
    if (!product.inStock || checkoutLoading || !canPayOnline) return;
    setPayError(null);
    setPayBusy(true);
    try {
      await loadRazorpayCheckoutScript();
      const order = await createProductCheckoutRazorpayOrder(product.id, 'single', { quantity });
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error('Razorpay failed to load.');
      const rzp = new Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: order.store_name,
        description: `${order.product_name} × ${quantity}`,
        order_id: order.razorpay_order_id,
        handler: async (response: Record<string, string>) => {
          try {
            await verifyProductCheckoutRazorpayPayment(product.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            window.alert('Payment successful. The seller will confirm your order.');
          } catch (err) {
            setPayError(
              isApiError(err) ? err.message : err instanceof Error ? err.message : 'Could not verify payment',
            );
          } finally {
            setPayBusy(false);
          }
        },
        theme: { color: CATALOG_ACCENT },
        modal: {
          ondismiss: () => setPayBusy(false),
        },
      });
      rzp.on('payment.failed', (r: { error?: { description?: string } }) => {
        setPayError(r.error?.description ?? 'Payment failed');
        setPayBusy(false);
      });
      rzp.open();
    } catch (err) {
      setPayError(isApiError(err) ? err.message : err instanceof Error ? err.message : 'Could not start payment');
      setPayBusy(false);
    }
  };

  const handleBuyNowPayment = async () => {
    if (!product.inStock || checkoutLoading) return;
    setPayError(null);
    if (canPayOnline) {
      await startRazorpayCheckout();
      return;
    }
    if (canPayQr) {
      setPayError('Scan the QR code below to pay.');
      queueMicrotask(() => {
        qrSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    setPayError('This seller has not enabled payments on their plan yet.');
  };

  const handleAddToCartFromModal = () => {
    if (addDisabled) return;
    onAddToCart(quantity);
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const panel = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close product details"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-now-product-title"
        className="relative z-[201] flex max-h-[min(92vh,740px)] w-full max-w-[min(100%,26rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-2xl sm:max-h-[85vh] sm:max-w-lg"
        style={{ backgroundColor: '#f8fafc' }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2.5 sm:px-5 sm:py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs" style={{ color: CATALOG_ACCENT }}>
            Buy now
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 sm:p-2"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3">
          <div className="flex justify-center">
            {/* Fixed 1:1 frame; larger for better product visibility */}
            <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-xl bg-white aspect-square sm:h-72 sm:w-72">
              <Image
                src={heroSrc}
                alt={product.name}
                fill
                className="object-contain p-1.5 sm:p-2"
                sizes="(max-width: 640px) 176px, 288px"
                priority
              />
              {discount ? (
                <div
                  className="absolute left-1.5 top-1.5 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white sm:left-2 sm:top-2 sm:px-2.5 sm:py-1 sm:text-[11px]"
                  style={{ backgroundColor: CATALOG_ACCENT, borderRadius: '10px 4px 10px 4px' }}
                >
                  {discount}% off
                </div>
              ) : null}
              {!product.inStock ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                  <span className="text-center text-xs font-semibold text-white sm:text-sm">Out of stock</span>
                </div>
              ) : null}
            </div>
          </div>

          {gallery.length > 1 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {gallery.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  className="relative h-9 w-9 overflow-hidden rounded-lg bg-white transition sm:h-14 sm:w-14"
                  style={{
                    boxShadow:
                      heroIndex === i ? `inset 0 0 0 2px ${CATALOG_ACCENT}` : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                  }}
                  aria-label={`Image ${i + 1}`}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="56px" />
                </button>
              ))}
            </div>
          ) : null}

          <p className="mt-2 text-[8px] font-medium uppercase tracking-wide" style={{ color: CATALOG_MUTED }}>
            {categoryLabel}
          </p>
          <h2 id="buy-now-product-title" className="mt-0.5 text-[12px] font-semibold leading-snug text-slate-900 sm:text-lg">
            {product.name}
          </h2>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
            <span className="text-base font-bold tabular-nums text-slate-900 sm:text-xl">{formatCurrencyDisplay(product.price)}</span>
            {unitLabel ? (
              <span className="text-[9px] font-semibold" style={{ color: CATALOG_MUTED }}>
                /{unitLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]" style={{ color: CATALOG_MUTED }}>
            <p>
              Sold as: <span className="font-semibold text-slate-800">{unitDetail}</span>
            </p>
            <p>
              Min order:{' '}
              <span className="font-semibold text-slate-800">{product.minOrderQuantity != null && product.minOrderQuantity > 1 ? product.minOrderQuantity : 1}</span>
            </p>
            <p className="inline-flex items-center gap-1">
              <Star className="h-2.5 w-2.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-medium text-slate-800">{product.rating.toFixed(1)}</span>
            </p>
            <p>
              Reviews: <span className="font-semibold text-slate-800">{product.totalReviews}</span>
            </p>
          </div>

          {product.description?.trim() ? (
            <div className="mt-2 border-t border-slate-200 pt-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: CATALOG_MUTED }}>
                Details
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">{product.description.trim()}</p>
            </div>
          ) : null}

          {product.wholesaleEnabled && product.wholesalePrice != null ? (
            <p className="mt-1.5 text-[9px] font-semibold sm:text-xs">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                Wholesale {formatCurrencyDisplay(product.wholesalePrice)}
                {product.wholesaleMinQty ? ` · Min ${product.wholesaleMinQty}` : ''}
              </span>
            </p>
          ) : null}

          <div className="mt-3 border-t border-slate-200 pt-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: CATALOG_MUTED }}>
              Quantity
            </p>
            <div className="mt-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              <div className="flex items-center gap-2">
                <div className="inline-flex min-w-[90px] items-center justify-between rounded-xl border border-slate-200 bg-white px-1 py-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-2.5 w-2.5 text-slate-700" strokeWidth={2.5} />
                  </button>
                  <span className="min-w-[1.5rem] text-center text-[11px] font-bold tabular-nums text-slate-900">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => onQuantityChange(Math.min(BUY_MODAL_MAX_QTY, quantity + 1))}
                    disabled={quantity >= BUY_MODAL_MAX_QTY}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-2.5 w-2.5 text-slate-700" strokeWidth={2.5} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCartFromModal}
                  disabled={addDisabled}
                  className={`inline-flex h-8 min-w-[108px] items-center justify-center rounded-xl px-2.5 text-[10px] font-semibold shadow-sm transition sm:min-w-[150px] sm:text-sm ${
                    addDisabled
                      ? 'cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={() => void handleBuyNowPayment()}
                  disabled={!product.inStock || checkoutLoading || payBusy || !hasAnyPayment}
                  className={`inline-flex h-8 min-w-[108px] items-center justify-center rounded-xl px-2.5 text-[10px] font-semibold shadow-sm transition sm:min-w-[150px] sm:text-sm ${
                    !product.inStock || checkoutLoading || payBusy || !hasAnyPayment
                      ? 'cursor-not-allowed bg-slate-300 text-white'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Pay & Buy Online
                </button>
              </div>
            </div>
            <p className="mt-1 text-[8px]" style={{ color: CATALOG_MUTED }}>
              Max {BUY_MODAL_MAX_QTY} per line · Total {formatCurrencyDisplay(lineTotal)}
            </p>
            {addSuccessMessage ? (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-medium text-emerald-700">
                {addSuccessMessage}
              </p>
            ) : null}
          </div>

          {canPayQr && checkout?.paymentQrUrl ? (
            <div ref={qrSectionRef} className="mt-3 border-t border-slate-200 pt-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: CATALOG_MUTED }}>
                Pay via QR
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-700">
                Scan this QR code to pay the seller.
              </p>
              <div className="mt-2 flex justify-center">
                <div className="w-full max-w-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                  <img
                    src={checkoutQrImageSrc(checkout.paymentQrUrl)}
                    alt="Payment QR code"
                    className="h-auto w-full object-contain"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
          {checkoutLoadError ? (
            <p className="mb-2 text-center text-xs text-amber-600">{checkoutLoadError}</p>
          ) : null}
          {payError ? <p className="mb-2 text-center text-xs text-rose-600">{payError}</p> : null}
          {checkoutLoading ? (
            <p className="text-center text-xs text-slate-500">Loading payment options…</p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

type StoreCatalogProductCardProps = {
  product: Product;
  whatsappLink: string;
  storeName: string;
  isStoreOwner: boolean;
  showOwnerUploadButton?: boolean;
  cartQty: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
};

function StoreCatalogProductCard({
  product,
  whatsappLink,
  storeName,
  isStoreOwner,
  showOwnerUploadButton = false,
  cartQty,
  onAddToCart,
  onBuyNow,
}: StoreCatalogProductCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const gallery = useMemo(() => buildProductGallery(product), [product]);
  const heroSrc = gallery[activeIndex] ?? product.image;
  const isDemoProduct = product.id.startsWith('demo');
  const [heroImageSrc, setHeroImageSrc] = useState(heroSrc || FALLBACK_PRODUCT_IMAGE);
  const [demoImageSrc, setDemoImageSrc] = useState(DEMO_PRODUCT_CTA_IMAGE);
  const discount = getDiscountPercent(product.price, product.originalPrice);
  const badgeLabel = discount ? 'Best Seller' : 'Featured';
  const brandInitial = (storeName?.trim()?.charAt(0) || 'B').toUpperCase();
  const unitLabel = formatPriceUnitLabel(product);
  const cardClickable = true;

  useEffect(() => {
    setHeroImageSrc(heroSrc || FALLBACK_PRODUCT_IMAGE);
  }, [heroSrc]);

  useEffect(() => {
    if (isDemoProduct) {
      setDemoImageSrc(DEMO_PRODUCT_CTA_IMAGE);
    }
  }, [isDemoProduct, product.id]);

  return (
    <article
      onClick={cardClickable ? onBuyNow : undefined}
      onKeyDown={
        cardClickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onBuyNow();
              }
            }
          : undefined
      }
      role={cardClickable ? 'button' : undefined}
      tabIndex={cardClickable ? 0 : -1}
      className={`group flex h-full min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-500 bg-white font-sans shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:opacity-[0.98] ${
        cardClickable ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F29]/60' : ''
      }`}
      aria-label={cardClickable ? `View details for ${product.name}` : undefined}
    >
      <div className="relative overflow-hidden">
        <div className="relative block h-[45vw] max-h-[180px] w-full bg-slate-100 p-0 md:h-auto md:max-h-none md:aspect-[4/3]">
          {isDemoProduct && isStoreOwner ? (
            <Link
              href="/dashboard/products"
              prefetch
              onClick={(event) => event.stopPropagation()}
              className="relative block h-full w-full cursor-pointer"
            >
              <Image
                src={demoImageSrc}
                alt={product.name}
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 50vw"
                onError={() => {
                  setDemoImageSrc(FALLBACK_PRODUCT_IMAGE);
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-white/50" />
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <span className="relative z-10 rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white shadow-sm">Upload Product</span>
              </div>
            </Link>
          ) : (
            <Image
              src={isDemoProduct ? demoImageSrc : heroImageSrc}
              alt={product.name}
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 50vw"
              onError={() => {
                if (isDemoProduct) {
                  setDemoImageSrc(FALLBACK_PRODUCT_IMAGE);
                  return;
                }
                setHeroImageSrc(FALLBACK_PRODUCT_IMAGE);
              }}
            />
          )}
          {isDemoProduct && !isStoreOwner ? <div className="pointer-events-none absolute inset-0 bg-white/50" /> : null}
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-800 shadow-sm md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[10px]">
            {badgeLabel}
          </span>
          <span className="pointer-events-none absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-800 shadow-sm md:right-3 md:top-3 md:h-8 md:w-8 md:text-xs">
            {brandInitial}
          </span>
          {!product.inStock ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55">
              <span className="font-semibold text-white">Out of stock</span>
            </div>
          ) : null}
          {gallery.length > 1 ? (
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              {gallery.slice(0, 5).map((src, i) => (
                <span
                  key={`${src}-${i}`}
                  className={`h-1.5 w-1.5 rounded-full md:h-2 md:w-2 ${activeIndex === i ? 'bg-white' : 'bg-white/55'}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white p-2 md:p-4">
        <h3 className="line-clamp-2 min-w-0 text-[11px] font-bold leading-tight text-slate-900 md:text-lg">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-1.5 md:mt-4">
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-800 md:px-3 md:py-1 md:text-sm">
            {formatCurrencyDisplay(product.price)}
            {unitLabel ? ` /${unitLabel}` : ''}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart();
            }}
            disabled={!product.inStock}
            title={
              product.inStock ? 'Add to cart' : 'Out of stock'
            }
            className={`inline-flex min-w-[74px] items-center justify-center gap-0.5 rounded-full border px-2 py-1 text-[8px] font-semibold transition md:min-w-[120px] md:gap-1 md:px-3.5 md:py-1.5 md:text-xs ${
              product.inStock
                ? 'border-slate-900 bg-white text-slate-900 hover:bg-slate-100'
                : 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500'
            }`}
          >
            <ShoppingCart className="h-2 w-2 md:h-3.5 md:w-3.5" />
            Add to cart
          </button>
        </div>
        {product.wholesaleEnabled && product.wholesalePrice != null ? (
          <p className="mt-1 text-[8px] font-semibold text-slate-500 md:text-[11px] sm:mt-2">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-emerald-700 sm:px-2 sm:py-1">
              Wholesale {formatCurrencyDisplay(product.wholesalePrice)}
              {product.wholesaleMinQty ? ` · Min ${product.wholesaleMinQty}` : ''}
            </span>
          </p>
        ) : null}
      </div>

    </article>
  );
}

type ProductGridProps = {
  products: Product[];
  realProductsCount: number;
  services?: Service[];
  theme: Theme;
  visibleCount: number;
  onLoadMore: () => void;
  onResetVisible: () => void;
  whatsappLink: string;
  storeName: string;
  storeWhatsapp?: string;
  /** Viewer is the store owner. */
  isStoreOwner: boolean;
  cartEntries: CartEntry[];
  onAddToCart: (product: Product, quantity: number) => void;
};

type CombinedEntry =
  | { type: 'product'; product: Product }
  | { type: 'service'; service: Service };

const ServiceCard = ({
  service,
  whatsappLink,
  whatsappNumber,
}: {
  service: Service;
  whatsappLink: string;
  whatsappNumber?: string | null;
}) => {
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const hasServicePrice = service.price != null;
  const minQuantity = service.minQuantity && service.minQuantity > 0 ? service.minQuantity : null;
  const packagePrice = service.packagePrice != null ? service.packagePrice : null;

  return (
    <article className="group flex h-full min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-500 bg-white font-sans shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:opacity-[0.98]">
      <div className="relative overflow-hidden">
        <div className="relative block h-[45vw] max-h-[180px] w-full bg-slate-100 p-0 md:h-auto md:max-h-none md:aspect-[4/3]">
          {service.image ? (
            <button
              type="button"
              onClick={() => setImageLightboxOpen(true)}
              className="relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
              aria-label={`View ${service.title} image`}
            >
              <Image
                src={service.image}
                alt={service.title}
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 50vw"
              />
            </button>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Briefcase className="h-8 w-8 md:h-10 md:w-10" />
            </div>
          )}
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-800 shadow-sm md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[10px]">
            Service
          </span>
          <span
            className={`pointer-events-none absolute right-2 top-2 inline-flex h-7 items-center justify-center rounded-full px-2.5 text-[10px] font-semibold shadow-sm md:right-3 md:top-3 md:h-8 md:px-3 md:text-xs ${
              service.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {service.isActive ? 'Live' : 'Hidden'}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white p-2 md:p-4">
        <h3 className="line-clamp-2 min-w-0 text-[11px] font-bold leading-tight text-slate-900 md:text-lg">{service.title}</h3>
        {service.description ? (
          <p className="mt-1 line-clamp-2 text-[10px] text-slate-500 md:text-sm">{service.description}</p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-1.5 md:mt-4">
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-800 md:px-3 md:py-1 md:text-sm">
            {hasServicePrice ? formatCurrencyDisplay(service.price as number) : 'Custom quote'}
          </span>
          <a
            href={`${whatsappLink}?text=${encodeURIComponent(
              `Hi, I'm interested in the service "${service.title}". Please share more details.`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-full border border-[#1f9d55] bg-[#25D366] px-2 py-1 text-[8px] font-semibold text-white shadow-[0_6px_14px_rgba(37,211,102,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1ebe5d] md:gap-1.5 md:px-3.5 md:py-1.5 md:text-xs"
          >
            <MessageCircle className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
            WhatsApp
          </a>
        </div>
        {(minQuantity || packagePrice != null) && (
          <p className="mt-1 text-[8px] font-semibold text-slate-500 md:mt-2 md:text-[11px]">
            {minQuantity ? (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600 md:px-2 md:py-1">
                Min {minQuantity} {minQuantity > 1 ? 'units' : 'unit'}
              </span>
            ) : null}
            {packagePrice != null ? (
              <span className="ml-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-600 md:ml-2 md:px-2 md:py-1">
                Package {formatCurrencyDisplay(packagePrice)}
              </span>
            ) : null}
          </p>
        )}
      </div>

      {service.image ? (
        <StoreMediaLightbox
          open={imageLightboxOpen}
          images={[service.image]}
          initialIndex={0}
          title={service.title}
          onClose={() => setImageLightboxOpen(false)}
        />
      ) : null}
    </article>
  );
};

type SortOption = 'featured' | 'priceLowHigh' | 'priceHighLow';
type PriceFilter = 'all' | 'under-1000' | '1000-5000' | 'above-5000';

const ProductGrid = ({
  products,
  realProductsCount,
  services,
  theme,
  visibleCount,
  onLoadMore,
  onResetVisible,
  whatsappLink,
  storeName,
  storeWhatsapp,
  isStoreOwner,
  cartEntries,
  onAddToCart,
}: ProductGridProps) => {
  const [filterType, setFilterType] = useState<'all' | 'products' | 'services'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('featured');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<Product | null>(null);
  const [buyNowQty, setBuyNowQty] = useState(1);

  useEffect(() => {
    setSearchQuery('');
    setPriceFilter('all');
    setSortOption('featured');
    if (filterType !== 'services') {
      onResetVisible();
    }
  }, [filterType, onResetVisible]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const term = searchQuery.trim().toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.category?.toLowerCase().includes(term)
      );
    }

    result = result.filter((product) => {
      switch (priceFilter) {
        case 'under-1000':
          return product.price < 1000;
        case '1000-5000':
          return product.price >= 1000 && product.price <= 5000;
        case 'above-5000':
          return product.price > 5000;
        default:
          return true;
      }
    });

    switch (sortOption) {
      case 'priceLowHigh':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'priceHighLow':
        result.sort((a, b) => b.price - a.price);
        break;
      default:
        result.sort((a, b) => b.rating - a.rating || a.price - b.price);
    }

    return result;
  }, [products, searchQuery, sortOption, priceFilter]);

  const productsForFilter = filterType === 'services' ? [] : filteredProducts;
  const visibleProducts = productsForFilter.slice(0, visibleCount);
  const canLoadMore = visibleProducts.length < productsForFilter.length;
  const rawServices = services ?? [];

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    cartEntries.forEach((entry) => {
      map[entry.productId] = entry.quantity;
    });
    return map;
  }, [cartEntries]);

  const filteredServices = useMemo(() => {
    if (filterType === 'products') return [];
    if (!searchQuery.trim()) return rawServices;
    const term = searchQuery.trim().toLowerCase();
    return rawServices.filter((service) => {
      const haystack = `${service.title ?? ''} ${service.description ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [filterType, rawServices, searchQuery]);

  const serviceList = filterType === 'products' ? [] : filteredServices;

  const filtersActive =
    searchQuery.trim().length > 0 || (filterType !== 'services' && sortOption !== 'featured') || priceFilter !== 'all';

  const combinedEntries: CombinedEntry[] = useMemo(() => {
    const entries: CombinedEntry[] = [];
    if (filterType !== 'services') {
      visibleProducts.forEach((product) => entries.push({ type: 'product', product }));
    }
    if (filterType !== 'products') {
      serviceList.forEach((service) => entries.push({ type: 'service', service }));
    }
    return entries;
  }, [filterType, serviceList, visibleProducts]);

  const firstServiceIndex = useMemo(
    () => combinedEntries.findIndex((entry) => entry.type === 'service'),
    [combinedEntries]
  );
  const hasRealProducts = realProductsCount > 0;
  const showEmptyProductPlaceholders =
    realProductsCount === 0 &&
    !filtersActive &&
    filterType !== 'services' &&
    combinedEntries.length === 0;

  return (
    <section id="products" className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col gap-3 sm:gap-4"
          variants={fadeInVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.4 }}
        />

        <div className="mb-4 flex flex-col items-center gap-3 md:flex-row md:items-center">
              <div className="flex w-full items-center justify-center gap-2 md:w-auto md:justify-start">
                <button
                  type="button"
                  onClick={() => setFilterType(prev => prev === 'products' ? 'all' : 'products')}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    filterType === 'products'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Products
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType(prev => prev === 'services' ? 'all' : 'services')}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    filterType === 'services'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  Services
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileSearch(!showMobileSearch)}
                  className="md:hidden inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-700 hover:border-slate-400 transition-all"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              
              {/* Mobile Search Dropdown */}
              {showMobileSearch && (
                <div className="md:hidden relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      if (filterType !== 'services') {
                        onResetVisible();
                      }
                    }}
                    placeholder={`Search by ${filterType === 'services' ? 'service' : 'product'} or category`}
                    className="w-full rounded-full border border-transparent bg-white py-2 pl-11 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none ring-1 ring-slate-200 transition focus:border-[color:var(--primary-color)] focus:ring-[color:var(--primary-color)]/40"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSortOption('featured');
                        setPriceFilter('all');
                        onResetVisible();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:text-slate-700"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Desktop Search Bar */}
              <div className="relative flex-1 hidden md:block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    if (filterType !== 'services') {
                      onResetVisible();
                    }
                  }}
                  placeholder={`Search by ${filterType === 'services' ? 'service' : 'product'} or category`}
                  className="w-full rounded-full border border-transparent bg-white py-2 pl-11 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none ring-1 ring-slate-200 transition focus:border-[color:var(--primary-color)] focus:ring-[color:var(--primary-color)]/40"
                />
                {filtersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSortOption('featured');
                      setPriceFilter('all');
                      onResetVisible();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {combinedEntries.length === 0 ? (
              showEmptyProductPlaceholders ? (
                <div className="mt-6 sm:mt-10">
                  <motion.div
                    className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: false, amount: 0.2 }}
                  >
                    {Array.from({ length: 4 }, (_, i) => (
                      <motion.div
                        key={`empty-product-placeholder-${i}`}
                        className="min-w-0"
                        variants={fadeInVariants}
                        transition={{ delay: i * 0.02 }}
                      >
                        <article className="flex h-full min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                          <div className="relative h-[45vw] max-h-[180px] w-full bg-slate-50 md:aspect-[4/3] md:h-auto md:max-h-none">
                            <Image
                              src={OWNER_NO_PRODUCTS_PLACEHOLDER_IMAGE}
                              alt=""
                              fill
                              className="object-contain p-3"
                              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 50vw"
                            />
                          </div>
                          <div className="flex flex-col gap-2.5 px-2 py-3 md:gap-3 md:px-4 md:py-4">
                            <p className="text-center text-[11px] font-medium leading-snug text-slate-600 md:text-sm">
                              {isStoreOwner
                                ? 'Upload your first products here.'
                                : 'No products yet — check back soon.'}
                            </p>
                            {isStoreOwner ? (
                              <Link
                                href="/dashboard/products"
                                prefetch
                                className="inline-flex w-full items-center justify-center rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-slate-800 md:py-2.5 md:text-xs"
                              >
                                Add products
                              </Link>
                            ) : null}
                          </div>
                        </article>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              ) : (
                <p className="mt-12 text-center text-slate-500">
                  {!filtersActive && realProductsCount === 0 && rawServices.length === 0
                    ? isStoreOwner
                      ? 'No products yet. Upload your first product to show it here.'
                      : 'No products yet. Please check back soon.'
                    : filterType === 'services'
                      ? 'No services match these filters. Try adjusting your search.'
                      : filterType === 'products'
                        ? 'No products match these filters. Try adjusting your search.'
                        : 'No products or services match these filters. Try adjusting your search.'}
                </p>
              )
            ) : (
              <>
              <motion.div
                key={filterType + searchQuery}
                className="mt-6 grid grid-cols-2 gap-2 min-w-0 sm:mt-10 sm:gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.2 }}
              >
                {combinedEntries.map((entry, index) => {
                  if (entry.type === 'service') {
                    const service = entry.service;
                    if (!service) return null;
                    return (
                      <motion.div
                        key={`service-${service.id}`}
                        className="min-w-0"
                        variants={fadeInVariants}
                        transition={{ delay: index * 0.02 }}
                        id={index === firstServiceIndex ? 'services' : undefined}
                      >
                        <ServiceCard
                          service={service}
                          whatsappLink={whatsappLink}
                          whatsappNumber={storeWhatsapp}
                        />
                      </motion.div>
                    );
                  }
                  const product = entry.product;
                  if (!product) return null;
                  return (
                    <motion.div
                      key={product.id}
                      className="min-w-0"
                      variants={fadeInVariants}
                      transition={{ delay: index * 0.02 }}
                    >
                      <StoreCatalogProductCard
                        product={product}
                        whatsappLink={whatsappLink}
                        storeName={storeName}
                        isStoreOwner={isStoreOwner}
                        showOwnerUploadButton={!hasRealProducts && isStoreOwner}
                        cartQty={cartQuantities[product.id] ?? 0}
                        onAddToCart={() => onAddToCart(product, 1)}
                        onBuyNow={() => {
                          setBuyNowProduct(product);
                          setBuyNowQty(1);
                        }}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
              {filterType !== 'services' ? (
                <div className="mt-3 flex justify-center">
                  <Link
                    href="/dashboard/products"
                    prefetch
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                  >
                    Upload more products
                  </Link>
                </div>
              ) : null}
              </>
            )}

        {filterType !== 'services' && canLoadMore && (
          <div className="mt-6 flex justify-center sm:mt-10">
            <button
              onClick={onLoadMore}
              style={{ boxShadow: `0 20px 40px ${theme.primary}22` }}
              className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black sm:max-w-none sm:px-10"
            >
              Load more
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {buyNowProduct ? (
          <BuyNowProductModal
            product={buyNowProduct}
            quantity={buyNowQty}
            storeName={storeName}
            isStoreOwner={isStoreOwner}
            onClose={() => setBuyNowProduct(null)}
            onQuantityChange={setBuyNowQty}
            onAddToCart={(qty) => onAddToCart(buyNowProduct, qty)}
          />
        ) : null}
      </div>
    </section>
  );
};

type StoreRatingBreakdown = Record<1 | 2 | 3 | 4 | 5, number>;

function StoreRatingSummaryCard({
  aggregateRating,
  totalRecordedReviews,
  ratingBreakdown,
  ratingBreakdownTotal,
  countCaption,
}: {
  aggregateRating: number;
  totalRecordedReviews: number;
  ratingBreakdown: StoreRatingBreakdown;
  ratingBreakdownTotal: number;
  /** Optional line under the count (e.g. device-only guest reviews). */
  countCaption?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-3 shadow-inner max-sm:p-3 sm:p-5">
      <div className="flex flex-col gap-4 max-sm:gap-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="flex flex-col items-start sm:min-w-[9rem]">
          <p className="text-3xl font-bold tabular-nums text-slate-900 max-sm:text-[1.75rem] sm:text-5xl">
            {aggregateRating.toFixed(1)}
          </p>
          <RatingStars rating={aggregateRating} size="sm" className="mt-0.5 max-sm:scale-90 max-sm:origin-left sm:mt-1" />
          <p className="mt-1 text-xs font-medium text-slate-600 max-sm:mt-0.5 max-sm:text-[0.65rem] sm:mt-1.5 sm:text-sm">
            {aggregateRating.toFixed(1)} out of 5
          </p>
          <p className="mt-0.5 text-[0.65rem] text-slate-400 max-sm:text-[0.6rem] sm:text-xs">
            Based on {totalRecordedReviews.toLocaleString()} review{totalRecordedReviews === 1 ? '' : 's'}
          </p>
          {countCaption ? (
            <p className="mt-1 max-w-[14rem] text-[0.6rem] leading-snug text-slate-400 max-sm:text-[0.55rem] sm:max-w-none sm:text-[0.65rem]">
              {countCaption}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 max-sm:space-y-1 sm:space-y-2">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const pct =
              ratingBreakdownTotal > 0 ? Math.round((ratingBreakdown[star] / ratingBreakdownTotal) * 100) : 0;
            const fillGradient =
              star >= 3
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                : 'bg-gradient-to-r from-amber-300 to-amber-500';
            return (
              <div key={star} className="flex items-center gap-1.5 max-sm:gap-1 sm:gap-3">
                <span className="w-2.5 text-right text-[0.6rem] font-medium tabular-nums text-slate-500 max-sm:w-2 sm:w-3 sm:text-[11px]">
                  {star}
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/90 max-sm:h-1.5 sm:h-2.5">
                  <div className={`h-full rounded-full transition-all ${fillGradient}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-7 shrink-0 text-right text-[0.6rem] font-semibold tabular-nums text-slate-600 max-sm:w-6 sm:w-9 sm:text-[11px]">
                  {ratingBreakdownTotal ? `${pct}%` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {totalRecordedReviews > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200/80 pt-3 max-sm:mt-2.5 max-sm:gap-1 max-sm:pt-2.5 sm:mt-5 sm:gap-2 sm:pt-4">
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[0.6rem] font-semibold text-sky-700 max-sm:px-2 max-sm:text-[0.55rem] sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px]">
            <ThumbsUp className="h-3 w-3 max-sm:h-2.5 max-sm:w-2.5" strokeWidth={2.25} />
            Loved it
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-700 max-sm:px-2 max-sm:text-[0.55rem] sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px]">
            <Check className="h-3 w-3 max-sm:h-2.5 max-sm:w-2.5" strokeWidth={2.25} />
            Good service
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[0.6rem] font-semibold text-rose-700 max-sm:px-2 max-sm:text-[0.55rem] sm:gap-1.5 sm:px-3 sm:py-1 sm:text-[11px]">
            <Zap className="h-3 w-3 max-sm:h-2.5 max-sm:w-2.5" strokeWidth={2.25} />
            Fast delivery
          </span>
        </div>
      ) : null}
    </div>
  );
}

const StoreFooter = ({ store }: { store: Store }) => (
  <footer id="contact" className="mt-[20px] mb-0 bg-slate-900 py-0 text-white">
    <motion.div
      className="mx-auto grid max-w-6xl grid-cols-3 gap-2 min-w-0 items-start px-2.5 py-2.5 sm:gap-8 sm:px-6 sm:py-4 lg:gap-10 lg:px-8"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <motion.div variants={fadeInVariants} className="min-w-0 space-y-1.5 sm:space-y-5">
        <div className="min-w-0">
          <p className="truncate text-[0.72rem] font-semibold leading-tight sm:text-xl">{store.name}</p>
        </div>
        <p className="text-[0.5rem] leading-snug text-white/60 sm:text-sm">
          Serving {store.location || 'your city'} with curated {store.businessType?.toLowerCase() || 'collections'} and
          concierge support.
        </p>
      </motion.div>

      <motion.div variants={fadeInVariants} className="min-w-0">
        <h4 className="text-[0.45rem] uppercase tracking-[0.12em] text-white/60 sm:text-sm sm:tracking-[0.4em]">
          Contact
        </h4>
        <ul className="mt-1.5 space-y-1 text-[0.52rem] leading-snug text-white/80 sm:mt-4 sm:space-y-3 sm:text-sm">
          {store.showPhone !== false && (
            <li className="flex items-start gap-1 sm:gap-2">
              <Phone className="mt-0.5 h-2.5 w-2.5 shrink-0 sm:mt-0 sm:h-4 sm:w-4" />
              <span className="min-w-0 break-all">{store.whatsapp}</span>
            </li>
          )}
          <li className="flex items-start gap-1 sm:gap-2">
            <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0 sm:mt-0 sm:h-4 sm:w-4" />
            <span className="min-w-0">{store.location}</span>
          </li>
          <li className="flex items-center gap-1 sm:gap-2">
            <MessageCircle className="h-2.5 w-2.5 shrink-0 sm:h-4 sm:w-4" /> Support 24/7
          </li>
        </ul>
      </motion.div>

      <motion.div variants={fadeInVariants} className="min-w-0">
        <h4 className="text-[0.45rem] uppercase tracking-[0.12em] text-white/60 sm:text-sm sm:tracking-[0.4em]">
          Location Map
        </h4>
        <div className="mt-1.5 overflow-hidden rounded-xl border border-white/15 bg-slate-950/40 sm:mt-4">
          <iframe
            title={`${store.name} location map`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(store.location || store.name)}&z=14&output=embed`}
            className="h-20 w-full sm:h-32"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.location || store.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2 py-1 text-[0.48rem] font-medium text-white/75 transition hover:text-white sm:px-3 sm:py-2 sm:text-xs"
          >
            Open in Google Maps
          </a>
        </div>
      </motion.div>
    </motion.div>

    <p className="mt-0 text-center text-[0.5rem] text-white/50 sm:text-xs">
      {new Date().getFullYear()} {store.name}. All rights reserved.
    </p>
  </footer>
);

export default function StoreView({
  store,
  products,
  services,
  reviews,
  reviewSummary,
  reviewPagination,
  reviewsLoading = false,
  reviewsError,
  onLoadMoreReviews,
  onSubmitStoreReview,
  onToggleFollow,
  onToggleLike,
  followBusy = false,
  likeBusy = false,
}: StoreViewProps) {
  const { isLoggedIn, user } = useAuth();
  const planIdentifier = store.activeSubscription?.plan?.slug?.toLowerCase()
    ?? store.activeSubscription?.plan?.name?.toLowerCase()
    ?? '';
  const isProPlan = Boolean(planIdentifier.includes('pro'));
  const INITIAL_VISIBLE_COUNT = 8;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const userStoreId =
    user && 'storeId' in user ? (user as { storeId?: string | number | null }).storeId : null;

  const whatsappLink = useMemo(() => {
    const raw = typeof store.whatsapp === 'string' && store.whatsapp.trim() !== ''
      ? store.whatsapp
      : (typeof store.phone === 'string' ? store.phone : '');
    let digits = raw.replace(/[^0-9]/g, '');
    // WhatsApp `wa.me` requires country code. Most India numbers are stored as 10 digits.
    if (digits.length === 10) {
      digits = `91${digits}`;
    }
    // Trim leading zeros if someone saved 0XXXXXXXXXX.
    if (digits.length > 10 && digits.startsWith('0')) {
      digits = digits.replace(/^0+/, '');
    }
    return digits ? `https://wa.me/${digits}` : '#';
  }, [store.phone, store.whatsapp]);
  /** Robust owner detection (IDs may arrive as number/string across endpoints). */
  const viewerOwnsStore = Boolean(
    (user?.id && store.userId && String(user.id) === String(store.userId)) ||
      (userStoreId && store.id && String(userStoreId) === String(store.id)) ||
      (user?.storeSlug &&
        store.username &&
        user.storeSlug.toLowerCase() === store.username.toLowerCase())
  );
  const canEngage = Boolean(store.id);
  const cartStorageKey = useMemo(() => `storeCart-${store.username}`, [store.username]);
  const guestReviewsStorageKey = useMemo(() => `storeGuestReviews:${store.id}`, [store.id]);
  const [cartEntries, setCartEntries] = useState<CartEntry[]>([]);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSharingCart, setIsSharingCart] = useState(false);
  const [guestReviews, setGuestReviews] = useState<Review[]>([]);
  const [guestReviewNotice, setGuestReviewNotice] = useState<string | null>(null);

  const theme = useMemo(() => getThemeForCategory(store.businessType), [store.businessType]);
  const marqueeCategory = store.businessType || 'exclusive collections';
  const marqueeMessage = `Welcome to ${store.name} — Trusted in ${store.location || 'your city'} · Call ${
    store.whatsapp || 'N/A'
  } · Signature picks in ${marqueeCategory}`;
  const approvedReviews = useMemo(() => reviews.filter((review) => review.isApproved !== false), [reviews]);
  const totalRecordedReviews = Math.max(reviewSummary?.totalReviews ?? 0, store.totalReviews ?? 0, approvedReviews.length);
  const aggregateRating = useMemo(() => {
    const raw = reviewSummary?.rating ?? store.rating;
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.max(0, Math.min(5, parsed));
  }, [reviewSummary?.rating, store.rating]);
  const reviewsMergedForStats = useMemo(
    () => [...guestReviews, ...approvedReviews],
    [guestReviews, approvedReviews]
  );
  const reviewsForList = useMemo(() => {
    const merged = [...guestReviews, ...approvedReviews];
    merged.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime());
    return merged;
  }, [guestReviews, approvedReviews]);
  const cardDisplayRating = useMemo(() => {
    if (reviewsMergedForStats.length === 0) return aggregateRating;
    const sum = reviewsMergedForStats.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const avg = sum / reviewsMergedForStats.length;
    if (!Number.isFinite(avg) || avg <= 0) return 0;
    return Math.max(0, Math.min(5, avg));
  }, [reviewsMergedForStats, aggregateRating]);
  const cardDisplayCount = reviewsMergedForStats.length > 0 ? reviewsMergedForStats.length : totalRecordedReviews;
  const ratingBreakdown = useMemo(
    () => ratingBreakdownFromSummaryOrReviews(reviewSummary, reviewsMergedForStats),
    [reviewSummary, reviewsMergedForStats]
  );
  const ratingBreakdownTotal = useMemo(
    () => (Object.values(ratingBreakdown) as number[]).reduce((a, b) => a + b, 0),
    [ratingBreakdown]
  );
  const [reviewForm, setReviewForm] = useState<{ rating: number; comment: string }>({ rating: 0, comment: '' });
  const [selectedQuickTags, setSelectedQuickTags] = useState<string[]>([]);
  const [reviewStarsResetKey, setReviewStarsResetKey] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const loadMoreProducts = () => {
    setVisibleCount((previous) => Math.min(previous + INITIAL_VISIBLE_COUNT, products.length));
  };

  const resetVisibleProducts = () => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const pageStyle = useMemo(() => ({ '--primary-color': theme.primary } as CSSProperties), [theme.primary]);

  const cartItemsCount = useMemo(() => {
    return cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  }, [cartEntries]);

  const cartTotal = useMemo(() => {
    return cartEntries.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);
  }, [cartEntries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedCart = localStorage.getItem(cartStorageKey);
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        if (Array.isArray(parsed)) {
          setCartEntries(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage', error);
    }
  }, [cartStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cartEntries));
    } catch (error) {
      console.error('Failed to save cart to localStorage', error);
    }
  }, [cartEntries, cartStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !store.id) return;
    try {
      const raw = localStorage.getItem(guestReviewsStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const restored: Review[] = parsed
        .filter((x): x is { id?: string; rating: number; comment: string; reviewedAt?: string } => {
          return Boolean(x && typeof x === 'object' && typeof (x as { rating?: unknown }).rating === 'number');
        })
        .map((x, i) => ({
          id: x.id ?? `guest-${store.id}-${i}`,
          storeId: store.id,
          userName: 'Guest (this device)',
          rating: x.rating,
          comment: typeof x.comment === 'string' ? x.comment : '',
          reviewedAt: x.reviewedAt ?? new Date().toISOString(),
          isApproved: true,
        }));
      setGuestReviews(restored);
    } catch {
      /* ignore */
    }
  }, [guestReviewsStorageKey, store.id]);

  const persistGuestReviews = useCallback(
    (updater: Review[] | ((previous: Review[]) => Review[])) => {
      setGuestReviews((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        try {
          localStorage.setItem(
            guestReviewsStorageKey,
            JSON.stringify(
              next.map((r) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                reviewedAt: r.reviewedAt,
              }))
            )
          );
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [guestReviewsStorageKey]
  );

  const handleAddToCart = useCallback(
    (product: Product, quantity: number) => {
      setCartEntries((prev) => {
        const totalItems = prev.reduce((sum, entry) => sum + entry.quantity, 0);
        if (totalItems >= MAX_CART_ITEMS) {
          setCartNotice(`Cart limit reached (${MAX_CART_ITEMS} items max)`);
          setTimeout(() => setCartNotice(null), 3000);
          return prev;
        }

        const existingIndex = prev.findIndex((entry) => entry.productId === product.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          const newQuantity = updated[existingIndex].quantity + quantity;
          updated[existingIndex] = { ...updated[existingIndex], quantity: newQuantity };
          return updated;
        }

        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity,
            image: product.image,
          },
        ];
      });
    },
    []
  );

  const handleUpdateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartEntries((prev) =>
      prev.map((entry) =>
        entry.productId === productId ? { ...entry, quantity: newQuantity } : entry
      )
    );
  }, []);

  const handleRemoveItem = useCallback((productId: string) => {
    setCartEntries((prev) => prev.filter((entry) => entry.productId !== productId));
  }, []);

  const handleShareWhatsapp = useCallback(async () => {
    if (!cartEntries.length) return;
    setIsSharingCart(true);
    try {
      const blob = await createCartSnapshotBlob(store, cartEntries, cartTotal);
      const file = new File([blob], 'cart-snapshot.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Cart from ${store.name}`,
          text: `My cart (${cartItemsCount} items, ₹${cartTotal})`,
        });
      } else {
        const itemsList = cartEntries.map((entry) => `${entry.name} x${entry.quantity} = ₹${entry.price * entry.quantity}`).join('\n');
        const message = `Hi ${store.name},\n\nMy Cart:\n${itemsList}\n\nTotal: ₹${cartTotal}`;
        const url = `${whatsappLink}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Failed to share cart', error);
      const itemsList = cartEntries.map((entry) => `${entry.name} x${entry.quantity} = ₹${entry.price * entry.quantity}`).join('\n');
      const message = `Hi ${store.name},\n\nMy Cart:\n${itemsList}\n\nTotal: ₹${cartTotal}`;
      const url = `${whatsappLink}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } finally {
      setIsSharingCart(false);
    }
  }, [cartEntries, cartTotal, cartItemsCount, store, whatsappLink]);

  const handleReviewFormChange = (partial: Partial<typeof reviewForm>) => {
    setReviewForm((previous) => ({ ...previous, ...partial }));
  };

  const handleSubmitStoreReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedComment = reviewForm.comment.trim();
    const quickLine = selectedQuickTags.length ? selectedQuickTags.join(' · ') : '';
    const mergedComment = [quickLine, trimmedComment].filter(Boolean).join('\n\n').trim();
    if (!reviewForm.rating) {
      setReviewError('Please tap a star to rate this store.');
      return;
    }
    if (!mergedComment) {
      setReviewError('Add a quick tag or a short note about your experience.');
      return;
    }
    if (mergedComment.length < 5) {
      setReviewError('Your review should be at least 5 characters.');
      return;
    }

    setReviewError(null);

    if (isLoggedIn && onSubmitStoreReview) {
      setIsSubmittingReview(true);
      try {
        await onSubmitStoreReview({ rating: reviewForm.rating, comment: mergedComment });
        setReviewForm({ rating: 0, comment: '' });
        setSelectedQuickTags([]);
        setReviewStarsResetKey((k) => k + 1);
        setGuestReviewNotice(null);
      } catch (err) {
        setReviewError(err instanceof Error ? err.message : 'Unable to submit review');
      } finally {
        setIsSubmittingReview(false);
      }
      return;
    }

    const newReview: Review = {
      id: `guest-${Date.now()}`,
      storeId: store.id,
      userName: 'Guest (this device)',
      rating: reviewForm.rating,
      comment: mergedComment,
      reviewedAt: new Date().toISOString(),
      isApproved: true,
    };
    persistGuestReviews((prev) => [newReview, ...prev]);
    setReviewForm({ rating: 0, comment: '' });
    setSelectedQuickTags([]);
    setReviewStarsResetKey((k) => k + 1);
    setGuestReviewNotice('Thanks! Saved on this device only. Sign in to share with the store.');
    window.setTimeout(() => setGuestReviewNotice(null), 6000);
  };

  const toggleQuickTag = (label: string) => {
    setSelectedQuickTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  return (
    <div className="min-h-screen" style={pageStyle}>
      <main>
        <div className="relative left-1/2 right-1/2 z-20 w-screen -translate-x-1/2 mt-0 md:mt-7">
          <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-slate-900/85 via-slate-900/60 to-slate-900/85" aria-hidden="true" />
          <div className="relative overflow-hidden border-y border-white/10 bg-gradient-to-r from-slate-900/85 via-slate-900/60 to-slate-900/85 px-6 py-4">
            <motion.div
              className="flex gap-10 whitespace-nowrap text-amber-300 text-sm font-medium"
              animate={{ x: [0, -1000] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <span key={index}>{marqueeMessage}</span>
              ))}
            </motion.div>
          </div>
        </div>
        <HeroSection
          store={store}
          theme={theme}
          products={products}
          services={services}
          whatsappLink={whatsappLink}
          isProPlan={isProPlan}
          isStoreOwner={viewerOwnsStore}
          canEngage={canEngage}
          onToggleFollow={onToggleFollow}
          onToggleLike={onToggleLike}
          followBusy={followBusy}
          likeBusy={likeBusy}
        />

        <ProductGrid
          products={products}
          realProductsCount={products.length}
          services={services}
          theme={theme}
          visibleCount={visibleCount}
          onLoadMore={loadMoreProducts}
          onResetVisible={resetVisibleProducts}
          whatsappLink={whatsappLink}
          storeName={store.name}
          storeWhatsapp={store.whatsapp}
          isStoreOwner={viewerOwnsStore}
          cartEntries={cartEntries}
          onAddToCart={handleAddToCart}
        />

        {/* Reviews — friendly rate + summary card (compact on mobile; guest ratings = device-only, no API) */}
        <section id="reviews" className="relative z-10 bg-[#f3f4f8] py-0 text-slate-900">
          <div className="mx-auto max-w-3xl px-3 max-sm:px-3 sm:px-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_22px_55px_-18px_rgba(15,23,42,0.18)] max-sm:rounded-[1.35rem] sm:rounded-[1.75rem]">
              <form onSubmit={handleSubmitStoreReview} className="text-left">
                <div className="border-b border-slate-100 p-3.5 max-sm:p-3 sm:p-8 sm:pb-6">
                  <div className="flex gap-2.5 max-sm:gap-2 sm:gap-4">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm max-sm:h-10 max-sm:w-10 sm:h-14 sm:w-14 sm:rounded-xl">
                      <Image
                        src={store.logo}
                        alt={`${store.name} logo`}
                        fill
                        className="object-cover"
                        sizes="(max-width:640px) 40px, 56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5 max-sm:space-y-0 sm:space-y-1">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 max-sm:leading-tight sm:text-[11px] sm:tracking-[0.2em]">
                        Verified buyer feedback
                      </p>
                      <h2 className="text-[13px] font-semibold leading-snug text-[#0f172a] max-sm:leading-tight sm:text-lg">
                        Rate and review the store
                      </h2>
                      {!isLoggedIn ? (
                        <p className="text-[0.65rem] leading-snug text-slate-500 max-sm:text-[0.6rem] sm:text-xs">
                          No sign-in required — saved on this device only.{' '}
                          <Link href="/login" className="font-semibold text-sky-600 underline-offset-2 hover:underline">
                            Sign in
                          </Link>{' '}
                          to publish to the store.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {guestReviewNotice ? (
                    <p className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[0.6rem] text-emerald-900 max-sm:mt-2 max-sm:px-2 max-sm:py-1 max-sm:text-[0.55rem] sm:mt-3 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">
                      {guestReviewNotice}
                    </p>
                  ) : null}

                  <div className="mt-3 max-sm:mt-2.5 sm:mt-5">
                    <div className="inline-block max-sm:scale-[0.88] max-sm:origin-left sm:scale-100">
                      <RatingStars
                        key={reviewStarsResetKey}
                        interactive
                        rating={reviewForm.rating}
                        size="lg"
                        className="gap-1 max-sm:gap-0.5 sm:gap-2"
                        onChange={(value) => handleReviewFormChange({ rating: value })}
                      />
                    </div>
                    <p className="mt-1 text-[0.65rem] text-slate-400 max-sm:mt-0.5 max-sm:text-[0.6rem] sm:text-xs">
                      Tap a star to rate
                    </p>
                  </div>

                  <label htmlFor="store_review_comment" className="sr-only">
                    Your experience
                  </label>
                  <input
                    id="store_review_comment"
                    type="text"
                    value={reviewForm.comment}
                    onChange={(event) => handleReviewFormChange({ comment: event.target.value })}
                    placeholder="Share your experience…"
                    autoComplete="off"
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 max-sm:mt-2.5 max-sm:py-1.5 max-sm:text-[0.7rem] sm:mt-5 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
                  />

                  <div className="mt-2.5 flex flex-wrap gap-1 max-sm:mt-2 max-sm:gap-1 sm:mt-4 sm:gap-2">
                    {(
                      [
                        {
                          label: 'Loved it',
                          Icon: Smile,
                          className: 'border-sky-200/90 bg-sky-50 text-sky-900 hover:bg-sky-100/90',
                        },
                        {
                          label: 'Good service',
                          Icon: Check,
                          className: 'border-emerald-200/90 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90',
                        },
                        {
                          label: 'Fast delivery',
                          Icon: Zap,
                          className: 'border-amber-200/90 bg-amber-50 text-amber-900 hover:bg-amber-100/90',
                        },
                        {
                          label: 'Friendly',
                          Icon: Heart,
                          className: 'border-orange-200/90 bg-orange-50 text-orange-900 hover:bg-orange-100/90',
                        },
                        {
                          label: 'Great price',
                          Icon: Tag,
                          className: 'border-violet-200/90 bg-violet-50 text-violet-900 hover:bg-violet-100/90',
                        },
                      ] as const
                    ).map(({ label, Icon, className }) => {
                      const on = selectedQuickTags.includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleQuickTag(label)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold transition max-sm:px-1.5 max-sm:py-[0.1rem] max-sm:text-[0.6rem] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs ${className} ${
                            on ? 'ring-2 ring-slate-900/10 ring-offset-1 ring-offset-white max-sm:ring-1 max-sm:ring-offset-0' : ''
                          }`}
                        >
                          <Icon
                            className="h-2.5 w-2.5 shrink-0 opacity-90 max-sm:h-2 max-sm:w-2 sm:h-3.5 sm:w-3.5"
                            strokeWidth={2.25}
                          />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="px-3.5 pb-3.5 max-sm:px-3 max-sm:pb-3 sm:px-8 sm:pb-6">
                  <StoreRatingSummaryCard
                    aggregateRating={cardDisplayRating}
                    totalRecordedReviews={cardDisplayCount}
                    ratingBreakdown={ratingBreakdown}
                    ratingBreakdownTotal={ratingBreakdownTotal}
                    countCaption={
                      guestReviews.length > 0
                        ? 'Includes ratings saved on this device only (not sent to the server).'
                        : undefined
                    }
                  />
                </div>

                {reviewError ? (
                  <p className="px-3.5 pb-1.5 text-[0.7rem] text-rose-600 max-sm:px-3 max-sm:text-[0.65rem] sm:px-8 sm:pb-2 sm:text-sm">
                    {reviewError}
                  </p>
                ) : null}

                <div className="px-3.5 pb-4 max-sm:px-3 max-sm:pb-3.5 sm:px-8 sm:pb-8">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400 py-2.5 text-xs font-semibold text-white shadow-[0_14px_32px_-8px_rgba(14,165,233,0.55)] transition hover:brightness-[1.03] disabled:opacity-60 max-sm:py-2 max-sm:text-[0.7rem] sm:py-3.5 sm:text-sm"
                  >
                    {isSubmittingReview ? (
                      <span className="inline-flex items-center justify-center gap-1.5 max-sm:gap-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin max-sm:h-3 max-sm:w-3 sm:h-4 sm:w-4" />
                        Submitting…
                      </span>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6 space-y-3 max-sm:mt-5 sm:mt-10 sm:space-y-4">
              {reviewsLoading && approvedReviews.length === 0 && guestReviews.length === 0 ? (
                <p className="text-xs text-slate-500 max-sm:text-[0.7rem] sm:text-sm">Loading reviews…</p>
              ) : reviewsForList.length === 0 ? (
                null
              ) : (
                reviewsForList.map((review) => <ReviewCard key={review.id} review={review} elevated />)
              )}
            </div>

            {reviewsError && <p className="mt-4 text-sm text-rose-600">{reviewsError}</p>}

            {reviewPagination?.hasMore && onLoadMoreReviews && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreReviews}
                  disabled={reviewsLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
                >
                  {reviewsLoading ? 'Loading…' : 'Load more reviews'}
                </button>
              </div>
            )}
          </div>
        </section>

        {cartItemsCount > 0 && (
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-20 right-6 z-50 inline-flex animate-[bounce_1.6s_ease-in-out_infinite] items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:scale-[1.03] hover:bg-emerald-600 md:bottom-6 md:px-5 md:py-2.5 md:text-sm"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Share via WhatsApp ({cartItemsCount})
          </button>
        )}
        {isCartOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-slate-900/60" onClick={() => setIsCartOpen(false)} />
            <div
              className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col rounded-none bg-white shadow-2xl transition sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-auto sm:max-h-[80vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Cart</p>
                  <h2 className="text-xl font-semibold text-slate-900">Saved items ({cartItemsCount})</h2>
                  {cartNotice && <p className="text-xs text-rose-500">{cartNotice}</p>}
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {!cartEntries.length ? (
                  <p className="text-sm text-slate-500">Add products to your cart to share a single WhatsApp request with the store owner.</p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {cartEntries.map((entry) => (
                      <li key={entry.productId} className="flex items-start gap-3 py-3 text-sm">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200">
                          <Image
                            src={entry.image}
                            alt={entry.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{entry.name}</p>
                          <p className="text-xs text-slate-500 mt-1">₹{entry.price} each</p>
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(entry.productId, entry.quantity - 1)}
                              disabled={entry.quantity <= 1}
                              className="px-2 text-xs text-slate-600 disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-xs font-semibold text-slate-800">{entry.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(entry.productId, entry.quantity + 1)}
                              className="px-2 text-xs text-slate-600"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="font-semibold text-slate-900">₹{entry.price * entry.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(entry.productId)}
                            className="rounded-full p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Remove item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-4 border-t border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                  <span>Cart total</span>
                  <span className="text-lg text-slate-900">₹{cartTotal}</span>
                </div>
                <button
                  type="button"
                  onClick={handleShareWhatsapp}
                  disabled={!cartEntries.length || isSharingCart}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.35)] disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  {isSharingCart ? 'Preparing snapshot…' : 'Share via WhatsApp'}
                </button>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400"
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay online (card / UPI)
                  </button>
                  <p className="text-center text-[11px] text-slate-500">
                    Online payment appears here when the seller enables it with an active paid plan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <StoreFooter store={store} />
      </main>
    </div>
  );
}
