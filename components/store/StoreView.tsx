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
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
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
  ShoppingCart,
  Briefcase,
  Layers,
  Youtube,
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
} from '@/types';
import RatingStars from '@/components/RatingStars';
import ReviewCard from '@/components/ReviewCard';
import { useAuth } from '@/src/context/AuthContext';
import { buildReviewColors, getThemeForCategory, type ReviewTheme } from '@/src/lib/reviewTheme';

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
const MAX_PER_ITEM = 5;

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

const ProductImageCarousel = ({ products, services }: { products: Product[]; services: Service[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

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
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
      <div className="relative aspect-[4/3]">
        {combinedItems.map((item, index) => {
          const itemTitle = item.type === 'product' ? (item.data as Product).name : (item.data as Service).title;
          const href = item.type === 'product' ? `/product/${item.data.id}` : `/service/${item.data.id}`;
          const hasImage = Boolean((item.data as Product | Service).image);

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
              <Link href={href} className="absolute inset-0 block">
                {hasImage ? (
                  <Image
                    src={(item.data as Product | Service).image}
                    alt={itemTitle}
                    fill
                    className="object-cover rounded-[28px]"
                    sizes="(max-width: 640px) 100vw, 512px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white/50 rounded-[28px]">
                    <Layers className="h-12 w-12" />
                  </div>
                )}
              </Link>
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
                  <Image src={store.logo} alt={`${store.name} logo`} fill className="object-cover" sizes="74px" />
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

const renderRatingStars = (rating: number) => {
  const fullStars = Math.round(rating);
  return Array.from({ length: 5 }).map((_, index) => (
    <Star key={index} className={`h-3 w-3 ${index < fullStars ? 'text-amber-400 fill-current' : 'text-slate-300'}`} />
  ));
};

const getDiscountPercent = (price?: number, original?: number) => {
  if (!price || !original || original <= price) return null;
  return Math.round(((original - price) / original) * 100);
};

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
  const billingLabel = formatServiceBillingLabel(service);
  const hasServicePrice = service.price != null;
  const minQuantity = service.minQuantity && service.minQuantity > 0 ? service.minQuantity : null;
  const packagePrice = service.packagePrice != null ? service.packagePrice : null;

  return (
    <article className="group rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] ring-1 ring-white/40 backdrop-blur transition hover:-translate-y-2 hover:shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
      <Link href={`/service/${service.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 rounded-2xl">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/40 bg-slate-50">
          {service.image ? (
            <Image
              src={service.image}
              alt={service.title}
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Briefcase className="h-10 w-10" />
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-900 shadow">
            Service
          </div>
          <div
            className={`absolute right-3 top-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
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
      </Link>
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
  cartEntries,
  onAddToCart,
}: ProductGridProps) => {
  const [filterType, setFilterType] = useState<'all' | 'products' | 'services'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('featured');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showMobileSearch, setShowMobileSearch] = useState(false);

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
                className="mt-6 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
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
                    <motion.article
                      key={product.id}
                      variants={fadeInVariants}
                      transition={{ delay: index * 0.02 }}
                      className="group rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] ring-1 ring-white/40 backdrop-blur transition hover:-translate-y-2 hover:shadow-[0_30px_70px_rgba(15,23,42,0.12)] cursor-pointer"
                    >
                      <Link
                        href={`/product/${product.id}`}
                        className="relative block aspect-square overflow-hidden rounded-xl border border-white/40"
                      >
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition duration-700 group-hover:scale-105"
                          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
                        />
                        {(() => {
                          const discount = getDiscountPercent(product.price, product.originalPrice);
                          if (!discount) return null;
                          return (
                            <div className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-lg">
                              {discount}% OFF
                            </div>
                          );
                        })()}
                      </Link>
                      <div className="mt-4 flex h-full flex-col space-y-3">
                        <div className="flex items-start gap-3">
                          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400 sm:text-xs">
                            {product.category || 'General'}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-semibold text-slate-900 line-clamp-1 sm:text-lg">{product.name}</h3>
                              <div className="mt-2 flex items-baseline gap-1 sm:gap-1.5">
                                <span className="text-lg font-semibold text-slate-900 sm:text-xl">
                                  {formatCurrencyDisplay(product.price)}
                                </span>
                                {(() => {
                                  const unitLabel = formatPriceUnitLabel(product);
                                  if (!unitLabel) return null;
                                  return (
                                    <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">/{unitLabel}</span>
                                  );
                                })()}
                                {product.originalPrice && (
                                  <span className="text-[11px] font-normal text-slate-400 line-through sm:text-xs">
                                    {formatCurrencyDisplay(product.originalPrice)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex w-full flex-col items-end gap-2 md:w-auto">
                              <div className="flex items-center gap-1 text-amber-400">
                                {renderRatingStars(product.rating ?? 4.5)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-auto space-y-3">
                          {product.wholesaleEnabled && product.wholesalePrice != null ? (
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                                Wholesale {formatCurrencyDisplay(product.wholesalePrice)}
                                {product.wholesaleMinQty ? ` · Min ${product.wholesaleMinQty}` : ''}
                              </span>
                            </div>
                          ) : null}
                          <div className="grid grid-cols-2 gap-2">
                            <a
                              href={`${whatsappLink}?text=Hi%20${encodeURIComponent(storeName)}%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_6px_14px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 hover:opacity-95"
                            >
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={() => onAddToCart(product, quantities[product.id] ?? 1)}
                              disabled={(cartQuantities[product.id] ?? 0) >= MAX_PER_ITEM}
                              className={`inline-flex w-full items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition hover:-translate-y-0.5 ${
                                (cartQuantities[product.id] ?? 0) >= MAX_PER_ITEM
                                  ? 'border-slate-200 text-slate-400'
                                  : 'border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              {cartQuantities[product.id]
                                ? `Added (${cartQuantities[product.id]})`
                                : 'Add to cart'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.article>
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
              <Image src={store.logo} alt={store.name} fill className="object-cover" sizes="48px" />
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
  const { isLoggedIn } = useAuth();
  const planIdentifier = store.activeSubscription?.plan?.slug?.toLowerCase()
    ?? store.activeSubscription?.plan?.name?.toLowerCase()
    ?? '';
  const isProPlan = Boolean(planIdentifier.includes('pro'));
  const INITIAL_VISIBLE_COUNT = 8;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const whatsappLink = useMemo(() => `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`, [store.whatsapp]);
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
  const ratingBreakdown = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    approvedReviews.forEach((review) => {
      const star = Math.min(5, Math.max(1, Math.round(review.rating || 0))) as 1 | 2 | 3 | 4 | 5;
      counts[star] += 1;
    });
    return counts;
  }, [approvedReviews]);
  const totalRecordedReviews = Object.values(ratingBreakdown).reduce((sum, count) => sum + count, 0);
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
          const newQuantity = Math.min(updated[existingIndex].quantity + quantity, MAX_PER_ITEM);
          updated[existingIndex] = { ...updated[existingIndex], quantity: newQuantity };
          return updated;
        }

        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: Math.min(quantity, MAX_PER_ITEM),
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
        entry.productId === productId
          ? { ...entry, quantity: Math.min(newQuantity, MAX_PER_ITEM) }
          : entry
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
          cartEntries={cartEntries}
          onAddToCart={handleAddToCart}
        />

        {/* Reviews Section */}
        <section id="reviews" className="py-16 bg-slate-50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Store reviews</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                Loved by shoppers across {store.location || 'your city'}
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Average rating {reviewSummary?.rating?.toFixed(1) ?? store.rating.toFixed(1)} from{' '}
                {reviewSummary?.totalReviews ?? store.totalReviews} orders.
              </p>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {isLoggedIn && onSubmitStoreReview ? (
                <button
                  type="button"
                  onClick={() => setIsReviewFormOpen((previous) => !previous)}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundColor: reviewColors.primary }}
                >
                  {isReviewFormOpen ? 'Close form' : 'Write a review'}
                </button>
              ) : (
                <span className="text-sm text-slate-600">Sign in to rate this store.</span>
              )}
              <span className="text-xs text-slate-400">Reviews are verified by our community</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center"
                style={{ boxShadow: `0 12px 32px ${reviewColors.primary}14` }}
              >
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Average rating</p>
                <div className="mt-4 flex items-end justify-center gap-3">
                  <span className="text-5xl font-semibold text-slate-900">{aggregateRating.toFixed(1)}</span>
                  <span className="pb-2 text-sm text-slate-400">/ 5</span>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-slate-900">
                  <RatingStars rating={aggregateRating} size="md" />
                  <span className="text-sm font-semibold">
                    {totalRecordedReviews || reviewSummary?.totalReviews || store.totalReviews} reviews
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Trusted by shoppers across {store.location || 'India'}.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Rating breakdown</p>
                <div className="mt-4 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingBreakdown[star as 1 | 2 | 3 | 4 | 5];
                    const percentage = totalRecordedReviews ? (count / totalRecordedReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="w-10 text-sm text-slate-500">{star}.0</span>
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${reviewColors.primary}, ${reviewColors.accent})`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-slate-500">{count}</span>
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
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-center"
                  >
                    <p className="text-2xl font-semibold text-slate-900">{highlight.value.toFixed(1)}</p>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{highlight.label}</p>
                  </div>
                ))}
              </div>
            )}

            {isReviewFormOpen && onSubmitStoreReview && isLoggedIn && (
              <form onSubmit={handleSubmitStoreReview} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-semibold text-slate-900">Your rating</label>
                  <RatingStars
                    interactive
                    rating={reviewForm.rating}
                    size="lg"
                    onChange={(value) => handleReviewFormChange({ rating: value })}
                  />
                </div>
                <div className="mt-4">
                  <label className="text-sm font-semibold text-slate-900" htmlFor="store_review_comment">
                    Share more about your visit
                  </label>
                  <textarea
                    id="store_review_comment"
                    rows={4}
                    value={reviewForm.comment}
                    onChange={(event) => handleReviewFormChange({ comment: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    placeholder="Talk about the service quality, delivery, and support…"
                    required
                  />
                </div>
                {reviewError && <p className="mt-3 text-sm text-rose-500">{reviewError}</p>}
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSubmittingReview ? 'Submitting…' : 'Submit review'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 space-y-4">
              {reviewsLoading && approvedReviews.length === 0 ? (
                <p className="text-sm text-slate-500">Loading reviews…</p>
              ) : approvedReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  This store hasn&apos;t received reviews yet.
                </div>
              ) : (
                approvedReviews.map((review) => <ReviewCard key={review.id} review={review} />)
              )}
            </div>

            {reviewsError && <p className="mt-4 text-sm text-rose-500">{reviewsError}</p>}

            {reviewPagination?.hasMore && onLoadMoreReviews && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreReviews}
                  disabled={reviewsLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-60"
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
                              disabled={entry.quantity >= MAX_PER_ITEM}
                              className="px-2 text-xs text-slate-600 disabled:opacity-40"
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
