'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  Sparkles,
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
  QrCode,
  Heart,
  UserPlus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
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
import { buildReviewColors, getThemeForCategory, type ReviewTheme } from '@/src/lib/reviewTheme';
import { ratingBreakdownFromSummaryOrReviews } from '@/src/lib/reviewRatingBreakdown';
import {
  getProductById,
  createProductCheckoutRazorpayOrder,
  verifyProductCheckoutRazorpayPayment,
  isApiError,
  toggleStoreFollow,
  toggleStoreLike,
  recordStoreView,
} from '@/src/lib/api';
import { loadRazorpayCheckoutScript } from '@/src/lib/razorpayCheckoutScript';
import { checkoutQrImageSrc } from '@/src/lib/checkoutAssetUrl';

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

const ProductImageCarousel = ({ products, services }: { products: Product[]; services: Service[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightbox, setLightbox] = useState<{ images: string[]; title: string } | null>(null);

  const combinedItems = useMemo(() => {
    const items: Array<{ type: 'product' | 'service'; data: Product | Service }> = [];
    (products ?? []).forEach((product) => items.push({ type: 'product', data: product }));
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
      <div className="relative aspect-[4/3]">
        {combinedItems.map((item, index) => {
          const itemTitle = item.type === 'product' ? (item.data as Product).name : (item.data as Service).title;
          const hasImage = Boolean((item.data as Product | Service).image);
          const heroImage = (item.data as Product | Service).image;
          const galleryImages =
            item.type === 'product'
              ? buildProductGallery(item.data as Product)
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
                    className="object-cover rounded-[28px]"
                    sizes="(max-width: 640px) 100vw, 512px"
                  />
                </button>
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

const baseNavLinks = [{ label: 'Home', href: '#home' }, { label: 'Reviews', href: '#reviews' }, { label: 'Contact', href: '#contact' }];

function StoreEngagementStrip({ store, isOwner }: { store: Store; isOwner: boolean }) {
  const [followers, setFollowers] = useState(store.followersCount ?? 0);
  const [likes, setLikes] = useState(store.likesCount ?? 0);
  const [seen, setSeen] = useState(store.seenCount ?? 0);
  const [following, setFollowing] = useState(store.viewerFollowing ?? false);
  const [liked, setLiked] = useState(store.viewerLiked ?? false);
  const [busy, setBusy] = useState<'follow' | 'like' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setFollowers(store.followersCount ?? 0);
    setLikes(store.likesCount ?? 0);
    setSeen(store.seenCount ?? 0);
    setFollowing(store.viewerFollowing ?? false);
    setLiked(store.viewerLiked ?? false);
  }, [store.id, store.followersCount, store.likesCount, store.seenCount, store.viewerFollowing, store.viewerLiked]);

  useEffect(() => {
    if (isOwner || typeof window === 'undefined') return;
    const dedupeKey = `storeSeenPing:${store.id}`;
    const now = Date.now();
    const last = sessionStorage.getItem(dedupeKey);
    if (last && now - Number(last) < 2000) return;
    sessionStorage.setItem(dedupeKey, String(now));
    let cancelled = false;
    void recordStoreView(store.id)
      .then((res) => {
        if (cancelled) return;
        if (typeof res.data?.seen_count === 'number') setSeen(res.data.seen_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [store.id, isOwner]);

  const onFollow = async () => {
    if (isOwner || busy) return;
    setBusy('follow');
    setErr(null);
    try {
      const res = await toggleStoreFollow(store.id);
      const d = res.data;
      setFollowers(d.followers_count);
      setLikes(d.likes_count);
      if (typeof d.viewer_following === 'boolean') setFollowing(d.viewer_following);
    } catch (e) {
      setErr(isApiError(e) ? e.message : 'Could not update follow');
    } finally {
      setBusy(null);
    }
  };

  const onLike = async () => {
    if (isOwner || busy) return;
    setBusy('like');
    setErr(null);
    try {
      const res = await toggleStoreLike(store.id);
      const d = res.data;
      setFollowers(d.followers_count);
      setLikes(d.likes_count);
      if (typeof d.viewer_liked === 'boolean') setLiked(d.viewer_liked);
    } catch (e) {
      setErr(isApiError(e) ? e.message : 'Could not update like');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section id="support-store" className="relative py-6 sm:py-8">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-violet-200/60 to-transparent" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04]">
          <div className="relative bg-gradient-to-br from-violet-600/5 via-white to-rose-500/5 px-5 py-5 sm:px-7 sm:py-6">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/4 -translate-y-1/4 rounded-full bg-violet-400/10 blur-2xl" aria-hidden />
            <div className="absolute bottom-0 left-0 h-28 w-28 -translate-x-1/4 translate-y-1/4 rounded-full bg-rose-400/10 blur-2xl" aria-hidden />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  Support this store
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-3xl sm:gap-4">
                  <div className="rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-white to-indigo-50/90 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
                        <UserPlus className="h-5 w-5" strokeWidth={2.2} />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600/90">Followers</p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                          {followers.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-rose-100/90 bg-gradient-to-br from-white to-rose-50/90 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25">
                        <Heart className="h-5 w-5" strokeWidth={2.2} />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600/90">Likes</p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                          {likes.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-teal-100/90 bg-gradient-to-br from-white to-teal-50/90 p-4 shadow-sm sm:col-span-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25">
                        <Eye className="h-5 w-5" strokeWidth={2.2} />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700/90">Seen</p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                          {seen.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {err ? <p className="text-xs font-medium text-rose-600">{err}</p> : null}
              </div>

              {isOwner ? (
                <div className="flex max-w-md flex-col gap-2 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/80 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/25 text-amber-800">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <p className="leading-snug">
                    <span className="font-semibold">Your storefront.</span> Followers, likes, and seen counts update on
                    your dashboard when visitors engage.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => void onFollow()}
                    disabled={busy !== null}
                    className={`inline-flex min-h-[44px] min-w-[140px] items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:opacity-60 ${
                      following
                        ? 'bg-slate-900 text-white shadow-slate-900/25 ring-2 ring-indigo-400/30'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500'
                    }`}
                  >
                    {busy === 'follow' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    {following ? 'Following' : 'Follow store'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onLike()}
                    disabled={busy !== null}
                    className={`inline-flex min-h-[44px] min-w-[140px] items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:opacity-60 ${
                      liked
                        ? 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-300/40'
                        : 'border border-rose-200/80 bg-white text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    {busy === 'like' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />}
                    {liked ? 'Liked' : 'Like store'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type HeroSectionProps = {
  store: Store;
  heroProduct?: Product;
  theme: Theme;
  whatsappLink: string;
  products: Product[];
  services: Service[];
  isProPlan: boolean;
};

const HeroSection = ({ store, heroProduct, theme, whatsappLink, products, services, isProPlan }: HeroSectionProps) => {
  const socialLinks = buildSocialLinks(store);
  const heroGradient = `linear-gradient(135deg, ${theme.primary}33 0%, ${theme.accent}55 35%, transparent 70%)`;

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
          className="absolute inset-0 z-20 flex flex-col gap-6 px-4 pt-10 pb-4 text-white sm:px-6 sm:pt-16 lg:px-10"
        >
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="w-full max-w-3xl text-center sm:text-left"
          >
            <motion.div
              variants={fadeInVariants}
              className="flex flex-col items-center gap-4 rounded-3xl bg-black/30 px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center"
            >
              <span className="relative inline-flex items-center">
                <span className="relative inline-flex h-[4.6rem] w-[4.6rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-white/95 p-1.5 shadow-xl">
                  {/* Native img: avoids Next image pipeline issues with proxied / cross-origin storage URLs */}
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
                <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">{store.name}</h1>
                {isProPlan && (
                  <span className="mt-3 inline-flex items-center gap-1 self-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-lg sm:self-start">
                    Pro Store
                  </span>
                )}
                <div className="mt-3 flex flex-col items-center gap-2 text-sm text-white/80 sm:hidden">
                  <div className="flex flex-wrap justify-center gap-4 text-center">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">{store.location}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-300" />
                      <span>{store.rating} · {store.totalReviews}+ reviews</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 text-center text-white/80">
                    <span className="inline-flex items-center gap-1 font-semibold text-white">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      {store.name}
                    </span>
                    {store.showPhone !== false && (
                      <span className="inline-flex items-center gap-1 text-white">
                        <Phone className="h-4 w-4" />
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

                {(products.length > 0 || services.length > 0) && (
                  <div className="mt-5 w-full sm:hidden">
                    <ProductImageCarousel products={products} services={services} />
                  </div>
                )}
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
            <div className="mt-6 hidden sm:flex justify-center">
              <a
                href={`${whatsappLink}?text=Hi%20${encodeURIComponent(store.name)}%2C%20I'm%20interested%20in%20your%20products.%20Here's%20your%20store%20catalogue%3A%20${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/95 px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-white sm:px-8 sm:text-base"
              >
                Share Catalogue Link
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </section>
      </div>
      <motion.div variants={fadeInVariants} className="mt-12 flex justify-center px-4 sm:hidden">
        <a
          href={`${whatsappLink}?text=Hi%20${encodeURIComponent(store.name)}%2C%20I'm%20interested%20in%20your%20products.%20Here's%20your%20store%20catalogue%3A%20${encodeURIComponent(window.location.href)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-white/95 px-6 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:bg-white sm:px-8 sm:text-base"
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
  /** Logged-in visitor owns this storefront — Razorpay / cart purchase is blocked. */
  isStoreOwner: boolean;
  onClose: () => void;
  onQuantityChange: (next: number) => void;
};

function BuyNowProductModal({
  product,
  quantity,
  storeName,
  isStoreOwner,
  onClose,
  onQuantityChange,
}: BuyNowProductModalProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(true);
  const [checkout, setCheckout] = useState<ProductCheckoutPublic | null>(null);
  const [checkoutLoadError, setCheckoutLoadError] = useState<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [qrHighlight, setQrHighlight] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const gallery = useMemo(() => buildProductGallery(product), [product]);
  const heroSrc = gallery[heroIndex] ?? product.image;
  const discount = getDiscountPercent(product.price, product.originalPrice);
  const categoryLabel = (product.category || 'General').toUpperCase();
  const unitLabel = formatPriceUnitLabel(product);
  const unitDetail = formatProductUnitLabel(product);
  const addDisabled = !product.inStock;
  const lineTotal = useMemo(() => product.price * quantity, [product.price, quantity]);
  const canPayOnline = Boolean(checkout?.onlinePaymentAvailable);
  const canPayQr = Boolean(checkout?.qrPaymentAvailable && checkout.paymentQrUrl);
  const hasAnyPayment = canPayOnline || canPayQr;

  useEffect(() => {
    setHeroIndex(0);
  }, [product.id]);

  useEffect(() => {
    let cancelled = false;
    if (isStoreOwner) {
      setCheckoutLoading(false);
      setCheckoutLoadError(null);
      setCheckout({
        onlinePaymentAvailable: false,
        qrPaymentAvailable: false,
        paymentQrUrl: null,
      });
      return () => {
        cancelled = true;
      };
    }
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

  const scrollToQr = () => {
    qrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setQrHighlight(true);
    window.setTimeout(() => setQrHighlight(false), 2000);
  };

  const startRazorpayCheckout = async () => {
    if (isStoreOwner || !product.inStock || checkoutLoading || !canPayOnline) return;
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
    if (isStoreOwner) {
      setPayError('You cannot purchase products from your own store.');
      return;
    }
    if (!product.inStock || checkoutLoading) return;
    setPayError(null);
    if (canPayOnline) {
      await startRazorpayCheckout();
      return;
    }
    if (canPayQr) {
      scrollToQr();
      return;
    }
    setPayError('This seller has not enabled online payment on their plan yet. Use the full product page or contact the store.');
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
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
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
        className="relative z-[201] flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
        style={{ backgroundColor: CATALOG_CARD_BG }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: CATALOG_ACCENT }}>
            Buy now
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-3 sm:px-5">
          {isStoreOwner ? (
            <p className="mb-3 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-center text-xs font-medium text-amber-100">
              You cannot buy your own products here. Customers use Pay online or QR on your live store.
            </p>
          ) : null}
          <div className="flex justify-center">
            {/* Fixed 1:1 frame, smaller than full modal width */}
            <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-white aspect-square sm:h-48 sm:w-48">
              <Image
                src={heroSrc}
                alt={product.name}
                fill
                className="object-contain p-1.5 sm:p-2"
                sizes="(max-width: 640px) 160px, 192px"
                priority
              />
              {discount ? (
                <div
                  className="absolute left-1.5 top-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:left-2 sm:top-2 sm:px-2.5 sm:py-1 sm:text-[11px]"
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
            <div className="mt-3 flex flex-wrap gap-2">
              {gallery.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  className="relative h-12 w-12 overflow-hidden rounded-lg bg-white transition sm:h-14 sm:w-14"
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

          <p className="mt-4 text-[11px] font-medium uppercase tracking-wider" style={{ color: CATALOG_MUTED }}>
            {categoryLabel}
          </p>
          <h2 id="buy-now-product-title" className="mt-1 text-lg font-semibold leading-snug text-white sm:text-xl">
            {product.name}
          </h2>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-bold tabular-nums text-white sm:text-2xl">{formatCurrencyDisplay(product.price)}</span>
            {unitLabel ? (
              <span className="text-sm font-semibold" style={{ color: CATALOG_MUTED }}>
                /{unitLabel}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs sm:text-sm" style={{ color: CATALOG_MUTED }}>
            Sold as: <span className="font-semibold text-white/90">{unitDetail}</span>
            {product.minOrderQuantity != null && product.minOrderQuantity > 1 ? (
              <span className="ml-2">· Min order {product.minOrderQuantity}</span>
            ) : null}
          </p>

          {product.wholesaleEnabled && product.wholesalePrice != null ? (
            <p className="mt-2 text-xs font-semibold sm:text-sm" style={{ color: CATALOG_MUTED }}>
              <span className="rounded-md bg-white/10 px-2 py-1 text-emerald-300">
                Wholesale {formatCurrencyDisplay(product.wholesalePrice)}
                {product.wholesaleMinQty ? ` · Min ${product.wholesaleMinQty}` : ''}
              </span>
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: CATALOG_MUTED }}>
            <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
            <span className="font-medium text-white/90">{product.rating.toFixed(1)}</span>
            <span>· {product.totalReviews} review{product.totalReviews === 1 ? '' : 's'}</span>
          </div>

          {product.description?.trim() ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: CATALOG_MUTED }}>
                Details
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{product.description.trim()}</p>
            </div>
          ) : null}

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: CATALOG_MUTED }}>
              Quantity
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="h-4 w-4 text-slate-700" strokeWidth={2.5} />
              </button>
              <span className="min-w-[2.5rem] text-center text-lg font-bold tabular-nums text-white">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => onQuantityChange(Math.min(BUY_MODAL_MAX_QTY, quantity + 1))}
                disabled={quantity >= BUY_MODAL_MAX_QTY}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4 text-slate-700" strokeWidth={2.5} />
              </button>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: CATALOG_MUTED }}>
              Max {BUY_MODAL_MAX_QTY} per line · Total {formatCurrencyDisplay(lineTotal)}
            </p>
          </div>

          {!checkoutLoading && canPayQr ? (
            <div
              ref={qrRef}
              className={`mt-6 rounded-xl border p-4 transition-[box-shadow] ${
                qrHighlight ? 'shadow-[0_0_0_2px_#FF9F29]' : ''
              }`}
              style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <QrCode className="h-4 w-4 shrink-0" style={{ color: CATALOG_ACCENT }} aria-hidden />
                Pay with UPI / QR
              </div>
              <p className="mt-1 text-xs" style={{ color: CATALOG_MUTED }}>
                Scan and pay {formatCurrencyDisplay(lineTotal)} for {storeName}. Then message the seller with your reference.
              </p>
              <div className="relative mx-auto mt-3 aspect-square w-full max-w-[200px] overflow-hidden rounded-xl bg-white">
                {checkout?.paymentQrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- must bypass next/image so /store-payment-qr hits Next rewrites
                  <img
                    src={checkoutQrImageSrc(checkout.paymentQrUrl)}
                    alt="Seller payment QR"
                    className="absolute inset-0 m-auto max-h-full max-w-full object-contain p-2"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#070b12] px-4 py-3 sm:px-5">
          {checkoutLoadError ? (
            <p className="mb-2 text-center text-xs text-amber-400/90">{checkoutLoadError}</p>
          ) : null}
          {payError ? <p className="mb-2 text-center text-xs text-rose-400">{payError}</p> : null}
          {checkoutLoading ? (
            <p className="mb-3 text-center text-xs text-white/45">Loading payment options…</p>
          ) : null}
          {canPayOnline && canPayQr ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPayError(null);
                  scrollToQr();
                }}
                disabled={addDisabled || checkoutLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF9F29] to-amber-500 px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <QrCode className="h-4 w-4 shrink-0" aria-hidden />
                Pay with UPI / QR
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void startRazorpayCheckout();
                }}
                disabled={addDisabled || checkoutLoading || payBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                {payBusy ? 'Opening checkout…' : 'Pay online (card / UPI)'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleBuyNowPayment();
              }}
              disabled={addDisabled || checkoutLoading || payBusy || !hasAnyPayment}
              title={
                !hasAnyPayment && !checkoutLoading
                  ? 'Seller has not enabled payment gateway or QR on their subscription'
                  : undefined
              }
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-lg transition ${
                addDisabled || checkoutLoading || payBusy || !hasAnyPayment
                  ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/35'
                  : 'bg-gradient-to-r from-[#FF9F29] to-amber-500 text-slate-900 hover:brightness-105'
              }`}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
              {checkoutLoading ? 'Loading…' : payBusy ? 'Opening checkout…' : canPayQr ? 'Show QR to pay' : 'Buy now'}
            </button>
          )}
          {!checkoutLoading && !hasAnyPayment ? (
            <p className="mt-2 text-center text-[11px] text-white/45">
              Online pay and QR appear here when the seller enables them with an active paid plan.
            </p>
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
  cartQty: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
};

function StoreCatalogProductCard({
  product,
  whatsappLink,
  storeName,
  isStoreOwner,
  cartQty,
  onAddToCart,
  onBuyNow,
}: StoreCatalogProductCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const gallery = useMemo(() => buildProductGallery(product), [product]);
  const heroSrc = gallery[activeIndex] ?? product.image;
  const discount = getDiscountPercent(product.price, product.originalPrice);
  const categoryLabel = (product.category || 'General').toUpperCase();
  const badgeLabel = discount ? 'Best Seller' : 'Featured';
  const brandInitial = (storeName?.trim()?.charAt(0) || 'B').toUpperCase();
  const unitLabel = formatPriceUnitLabel(product);

  return (
    <article
      className="group flex h-full min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white font-sans shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:opacity-[0.98]"
    >
      <div className="relative overflow-hidden">
        <button
          type="button"
          onClick={() => setImageLightboxOpen(true)}
          className="relative block h-[45vw] max-h-[180px] w-full cursor-zoom-in border-0 bg-slate-100 p-0 md:h-auto md:max-h-none md:aspect-[4/3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F29]/60"
          aria-label={`View ${product.name} images`}
        >
          <Image
            src={heroSrc}
            alt={product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 50vw"
          />
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
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white p-3 md:p-4">
        <h3 className="line-clamp-2 min-w-0 text-[15px] font-bold leading-tight text-slate-900 md:text-lg">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-slate-500 md:mt-1 md:text-sm">{categoryLabel}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500 md:mt-1 md:text-xs md:leading-relaxed">{product.description}</p>
        <div className="mt-3 flex items-center justify-between gap-2 md:mt-4">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-800 md:px-3 md:py-1 md:text-sm">
            {formatCurrencyDisplay(product.price)}
            {unitLabel ? ` /${unitLabel}` : ''}
          </span>
          <button
            type="button"
            onClick={onBuyNow}
            disabled={!product.inStock || isStoreOwner}
            title={
              isStoreOwner
                ? 'You cannot purchase your own products'
                : product.inStock
                  ? 'View details and choose quantity'
                  : 'Out of stock'
            }
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-white transition md:px-3.5 md:py-1.5 md:text-xs ${
              product.inStock && !isStoreOwner ? 'bg-black hover:bg-slate-900' : 'cursor-not-allowed bg-slate-400'
            }`}
          >
            Buy Now
            <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </button>
        </div>
        {product.wholesaleEnabled && product.wholesalePrice != null ? (
          <p className="mt-1.5 text-[10px] font-semibold text-slate-500 md:text-[11px] sm:mt-2">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-emerald-700 sm:px-2 sm:py-1">
              Wholesale {formatCurrencyDisplay(product.wholesalePrice)}
              {product.wholesaleMinQty ? ` · Min ${product.wholesaleMinQty}` : ''}
            </span>
          </p>
        ) : null}
      </div>

      <StoreMediaLightbox
        open={imageLightboxOpen}
        images={gallery}
        initialIndex={activeIndex}
        title={product.name}
        onClose={() => setImageLightboxOpen(false)}
      />
    </article>
  );
}

type ProductGridProps = {
  products: Product[];
  services?: Service[];
  theme: Theme;
  visibleCount: number;
  onLoadMore: () => void;
  onResetVisible: () => void;
  whatsappLink: string;
  storeName: string;
  storeWhatsapp?: string;
  /** Viewer is the store owner — hide self-purchase actions. */
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
  const billingLabel = formatServiceBillingLabel(service);
  const hasServicePrice = service.price != null;
  const minQuantity = service.minQuantity && service.minQuantity > 0 ? service.minQuantity : null;
  const packagePrice = service.packagePrice != null ? service.packagePrice : null;

  return (
    <article className="group min-w-0 w-full rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] ring-1 ring-white/40 backdrop-blur transition hover:-translate-y-2 hover:shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
      <div className="block rounded-2xl focus-within:outline-none focus-within:ring-2 focus-within:ring-slate-900/40">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/40 bg-slate-50">
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
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
              />
            </button>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Briefcase className="h-10 w-10" />
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-900 shadow">
            Service
          </div>
          <div
            className={`pointer-events-none absolute right-3 top-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
              service.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
            }`}
          >
            {service.isActive ? 'Live' : 'Hidden'}
          </div>
        </div>
        <div className="mt-4 flex h-full flex-col space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Signature service</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900 line-clamp-1 sm:text-lg">{service.title}</h3>
            {service.description && (
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{service.description}</p>
            )}
          </div>
          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-semibold text-slate-900 sm:text-xl">
                {hasServicePrice ? formatCurrencyDisplay(service.price as number) : 'Custom quote'}
              </span>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {billingLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
              {minQuantity ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  Min {minQuantity} {minQuantity > 1 ? 'units' : 'unit'}
                </span>
              ) : null}
              {packagePrice != null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-indigo-600">
                  Package {formatCurrencyDisplay(packagePrice)}
                </span>
              ) : null}
              {service.isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                  Instant booking
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-600">
                  Contact for slot
                </span>
              )}
            </div>
          </div>
        </div>
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
      <div className="mt-4">
        <a
          href={`${whatsappLink}?text=${encodeURIComponent(
            `Hi, I'm interested in the service "${service.title}". Please share more details.`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 hover:opacity-95"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp {whatsappNumber && whatsappNumber.trim().length > 0 ? `· ${whatsappNumber}` : ''}
        </a>
      </div>
    </article>
  );
};

type SortOption = 'featured' | 'priceLowHigh' | 'priceHighLow';
type PriceFilter = 'all' | 'under-1000' | '1000-5000' | 'above-5000';

const ProductGrid = ({
  products,
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

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
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
              <p className="mt-12 text-center text-slate-500">
                {filterType === 'services'
                  ? 'No services match these filters. Try adjusting your search.'
                  : filterType === 'products'
                    ? 'No products match these filters. Try adjusting your search.'
                    : 'No products or services match these filters. Try adjusting your search.'}
              </p>
            ) : (
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
          />
        ) : null}
      </div>
    </section>
  );
};

const CTASection = ({ theme, whatsappLink }: { theme: Theme; whatsappLink: string }) => (
  <section className="py-24" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.button})` }}>
    <div className="mx-auto max-w-4xl px-4 text-center text-white">
      <motion.h2
        variants={fadeInVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        className="text-4xl font-semibold"
      >
        Ready to order?
      </motion.h2>
      <motion.p
        variants={fadeInVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        className="mt-6 text-lg text-white/80"
      >
        Tap into concierge support for curated recommendations, lookbooks, and instant WhatsApp checkout.
      </motion.p>
      <motion.a
        variants={fadeInVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        href={`${whatsappLink}?text=Hi%2C%20I'm%20ready%20to%20place%20an%20order.`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative mt-10 inline-flex items-center gap-3 overflow-hidden rounded-full bg-white px-10 py-4 text-base font-semibold text-slate-900 transition hover:scale-[1.01]"
      >
        Chat on WhatsApp
        <MessageCircle className="h-5 w-5" />
        <span className="absolute inset-0 animate-pulse rounded-full border border-white/20" />
      </motion.a>
    </div>
  </section>
);

const StoreFooter = ({ store, theme, navLinks }: { store: Store; theme: Theme; navLinks: { label: string; href: string }[] }) => (
  <footer id="contact" className="bg-slate-900 py-16 text-white">
    <motion.div
      className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-3 lg:px-8"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <motion.div variants={fadeInVariants} className="space-y-5">
        <div className="rounded-3xl border border-white/20 bg-slate-950/60 p-5 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
          <div className="flex items-center gap-4">
            <span className="relative block h-12 w-12 overflow-hidden rounded-full border border-white/20">
              <img
                src={store.logo}
                alt={store.name}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">{store.businessType}</p>
              <p className="text-xl font-semibold leading-tight">{store.name}</p>
            </div>
          </div>
          {(store.shortDescription || store.description) && (
            <p className="mt-4 text-sm text-white/70">
              {store.shortDescription || store.description}
            </p>
          )}
        </div>
        <p className="text-sm text-white/60">
          Serving {store.location || 'your city'} with curated {store.businessType?.toLowerCase() || 'collections'} and concierge support.
        </p>
      </motion.div>

      <motion.div variants={fadeInVariants}>
        <h4 className="text-sm uppercase tracking-[0.4em] text-white/60">Quick Links</h4>
        <ul className="mt-4 space-y-2 text-sm text-white/80">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition hover:text-white">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div variants={fadeInVariants}>
        <h4 className="text-sm uppercase tracking-[0.4em] text-white/60">Contact</h4>
        <ul className="mt-4 space-y-3 text-sm text-white/80">
          {store.showPhone !== false && (
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> {store.whatsapp}
            </li>
          )}
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {store.location}
          </li>
          <li className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Support 24/7
          </li>
        </ul>
      </motion.div>
    </motion.div>

    <p className="mt-12 text-center text-xs text-white/50"> 2025 {store.name}. All rights reserved.</p>
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
}: StoreViewProps) {
  const { isLoggedIn, user } = useAuth();
  const planIdentifier = store.activeSubscription?.plan?.slug?.toLowerCase()
    ?? store.activeSubscription?.plan?.name?.toLowerCase()
    ?? '';
  const isProPlan = Boolean(planIdentifier.includes('pro'));
  const INITIAL_VISIBLE_COUNT = 8;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const whatsappLink = useMemo(() => `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`, [store.whatsapp]);
  /** Prefer store owner id — slug-only match can wrongly skip visit tracking if slugs collide or auth slug is stale. */
  const viewerOwnsStore = Boolean(
    (user?.id && store.userId && user.id === store.userId) ||
      (user?.storeSlug &&
        store.username &&
        user.storeSlug.toLowerCase() === store.username.toLowerCase())
  );
  const cartStorageKey = useMemo(() => `storeCart-${store.username}`, [store.username]);
  const [cartEntries, setCartEntries] = useState<CartEntry[]>([]);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSharingCart, setIsSharingCart] = useState(false);

  const theme = useMemo(() => getThemeForCategory(store.businessType), [store.businessType]);
  const reviewColors = useMemo(() => buildReviewColors(theme), [theme]);
  const marqueeCategory = products[0]?.category || store.businessType || 'exclusive collections';
  const marqueeMessage = `Welcome to ${store.name} — Trusted in ${store.location || 'your city'} · Call ${
    store.whatsapp || 'N/A'
  } · Signature picks in ${marqueeCategory}`;
  const approvedReviews = useMemo(() => reviews.filter((review) => review.isApproved !== false), [reviews]);
  const ratingBreakdown = useMemo(
    () => ratingBreakdownFromSummaryOrReviews(reviewSummary, approvedReviews),
    [reviewSummary, approvedReviews]
  );
  const totalRecordedReviews = useMemo(
    () => Object.values(ratingBreakdown).reduce((sum, count) => sum + count, 0),
    [ratingBreakdown]
  );
  const aggregateRating = reviewSummary?.rating ?? store.rating;
  const highlights = useMemo(() => {
    const clampScore = (value: number) => Math.min(5, Math.max(1, Number(value.toFixed(1))));
    return [
      { label: 'Service', value: clampScore(aggregateRating + 0.1) },
      { label: 'Cleanliness', value: clampScore(aggregateRating) },
      { label: 'Staff', value: clampScore(aggregateRating - 0.2) },
      { label: 'Value', value: clampScore(aggregateRating + 0.2) },
      { label: 'Location', value: clampScore(aggregateRating - 0.1) },
    ];
  }, [aggregateRating]);
  const [reviewForm, setReviewForm] = useState<{ rating: number; comment: string }>({ rating: 0, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const loadMoreProducts = () => {
    setVisibleCount((previous) => Math.min(previous + INITIAL_VISIBLE_COUNT, products.length));
  };

  const resetVisibleProducts = () => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const hasProducts = products.length > 0;
  const hasServices = services.length > 0;
  const navLinks = useMemo(() => {
    const links = [...baseNavLinks];
    if (hasProducts) links.splice(1, 0, { label: 'Products', href: '#products' });
    if (hasServices) links.splice(hasProducts ? 2 : 1, 0, { label: 'Services', href: '#services' });
    return links;
  }, [hasProducts, hasServices]);
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

  const handleAddToCart = useCallback(
    (product: Product, quantity: number) => {
      if (viewerOwnsStore) {
        setCartNotice("You can't add your own products to the cart.");
        window.setTimeout(() => setCartNotice(null), 3000);
        return;
      }
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
    [viewerOwnsStore]
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
        const itemsList = cartEntries
          .map((entry) => `${entry.name} x${entry.quantity} = ₹${entry.price * entry.quantity}`)
          .join('%0A');
        const message = `Hi ${store.name},%0A%0AMy Cart:%0A${itemsList}%0A%0ATotal: ₹${cartTotal}`;
        window.open(`${whatsappLink}?text=${message}`, '_blank');
      }
    } catch (error) {
      console.error('Failed to share cart', error);
      const itemsList = cartEntries
        .map((entry) => `${entry.name} x${entry.quantity} = ₹${entry.price * entry.quantity}`)
        .join('%0A');
      const message = `Hi ${store.name},%0A%0AMy Cart:%0A${itemsList}%0A%0ATotal: ₹${cartTotal}`;
      window.open(`${whatsappLink}?text=${message}`, '_blank');
    } finally {
      setIsSharingCart(false);
    }
  }, [cartEntries, cartTotal, cartItemsCount, store, whatsappLink]);

  const handleReviewFormChange = (partial: Partial<typeof reviewForm>) => {
    setReviewForm((previous) => ({ ...previous, ...partial }));
  };

  const handleSubmitStoreReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoggedIn) {
      setReviewError('Please log in to share your experience.');
      return;
    }
    if (!onSubmitStoreReview) return;
    const trimmedComment = reviewForm.comment.trim();
    if (!reviewForm.rating || !trimmedComment) {
      setReviewError('Please provide a rating and comment.');
      return;
    }
    if (trimmedComment.length < 5) {
      setReviewError('Comment must be at least 5 characters.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      await onSubmitStoreReview({ rating: reviewForm.rating, comment: trimmedComment });
      setReviewForm({ rating: 0, comment: '' });
      setIsReviewFormOpen(false);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen" style={pageStyle}>
      <main>
        <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 -mt-10 md:mt-7">
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
        />

        <StoreEngagementStrip store={store} isOwner={viewerOwnsStore} />

        <ProductGrid
          products={products}
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

        {/* Reviews — dark “testimonials” strip so it reads as its own chapter below the catalog */}
        <section
          id="reviews"
          className="relative isolate z-10 overflow-hidden bg-slate-950 py-16 text-slate-100 sm:py-20"
          style={{ backgroundColor: '#020617' }}
        >
          <div
            className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950 via-indigo-950/95 to-slate-950"
            aria-hidden
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-10 z-0 h-72 w-72 rounded-full blur-3xl opacity-35"
            style={{ backgroundColor: `${reviewColors.primary}66` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 bottom-8 z-0 h-64 w-64 rounded-full blur-3xl opacity-25"
            style={{ backgroundColor: `${reviewColors.accent}55` }}
          />
          <div
            aria-hidden
            className="absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:44px_44px] opacity-90"
          />

          <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-200/95">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                Store reviews
              </p>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Loved by shoppers across {store.location || 'your city'}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Average rating {reviewSummary?.rating?.toFixed(1) ?? store.rating.toFixed(1)} from{' '}
                {reviewSummary?.totalReviews ?? store.totalReviews} orders.
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {isLoggedIn && onSubmitStoreReview ? (
                <button
                  type="button"
                  onClick={() => setIsReviewFormOpen((previous) => !previous)}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/25 ring-1 ring-white/20 transition hover:brightness-110"
                  style={{ backgroundColor: reviewColors.primary }}
                >
                  {isReviewFormOpen ? 'Close form' : 'Write a review'}
                </button>
              ) : (
                <span className="text-sm text-slate-300">Sign in to rate this store.</span>
              )}
              <span className="text-center text-xs text-slate-400 sm:text-left">
                Reviews are verified by our community
              </span>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-6 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.4em] text-violet-200/85">Average rating</p>
                <div className="mt-4 flex items-end justify-center gap-3">
                  <span className="text-5xl font-semibold tabular-nums text-white">{aggregateRating.toFixed(1)}</span>
                  <span className="pb-2 text-sm text-slate-400">/ 5</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-white">
                  <RatingStars rating={aggregateRating} size="md" />
                  <span className="text-sm font-semibold">
                    {totalRecordedReviews || reviewSummary?.totalReviews || store.totalReviews} reviews
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Trusted by shoppers across {store.location || 'India'}.
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.4em] text-violet-200/85">Rating breakdown</p>
                <div className="mt-4 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingBreakdown[star as 1 | 2 | 3 | 4 | 5];
                    const percentage = totalRecordedReviews ? (count / totalRecordedReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="w-10 text-sm text-slate-400">{star}.0</span>
                        <div className="h-2 flex-1 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${reviewColors.primary}, ${reviewColors.accent})`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {highlights.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {highlights.map((highlight) => (
                  <div
                    key={highlight.label}
                    className="rounded-2xl border border-white/12 bg-white/[0.05] p-4 text-center backdrop-blur-sm"
                  >
                    <p className="text-2xl font-semibold tabular-nums text-white">{highlight.value.toFixed(1)}</p>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{highlight.label}</p>
                  </div>
                ))}
              </div>
            )}

            {isReviewFormOpen && onSubmitStoreReview && isLoggedIn && (
              <form
                onSubmit={handleSubmitStoreReview}
                className="mt-10 rounded-2xl border border-white/15 bg-white/[0.06] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-semibold text-white">Your rating</label>
                  <RatingStars
                    interactive
                    rating={reviewForm.rating}
                    size="lg"
                    onChange={(value) => handleReviewFormChange({ rating: value })}
                  />
                </div>
                <div className="mt-4">
                  <label className="text-sm font-semibold text-white" htmlFor="store_review_comment">
                    Share more about your visit
                  </label>
                  <textarea
                    id="store_review_comment"
                    rows={4}
                    value={reviewForm.comment}
                    onChange={(event) => handleReviewFormChange({ comment: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/30"
                    placeholder="Talk about the service quality, delivery, and support…"
                    required
                  />
                </div>
                {reviewError && <p className="mt-3 text-sm text-rose-400">{reviewError}</p>}
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2 text-sm font-semibold text-slate-900 shadow-md disabled:opacity-60"
                  >
                    {isSubmittingReview ? 'Submitting…' : 'Submit review'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-10 space-y-4">
              {reviewsLoading && approvedReviews.length === 0 ? (
                <p className="text-sm text-slate-400">Loading reviews…</p>
              ) : approvedReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/25 bg-white/[0.04] p-6 text-center text-sm text-slate-300 backdrop-blur-sm">
                  This store hasn&apos;t received reviews yet.
                </div>
              ) : (
                approvedReviews.map((review) => <ReviewCard key={review.id} review={review} elevated />)
              )}
            </div>

            {reviewsError && <p className="mt-4 text-sm text-rose-400">{reviewsError}</p>}

            {reviewPagination?.hasMore && onLoadMoreReviews && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreReviews}
                  disabled={reviewsLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/10 disabled:opacity-60"
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
            className="fixed bottom-20 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.35)] md:bottom-6"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart ({cartItemsCount})
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
              </div>
            </div>
          </div>
        )}
        <CTASection theme={theme} whatsappLink={whatsappLink} />
        <StoreFooter store={store} theme={theme} navLinks={navLinks} />
      </main>
    </div>
  );
}
