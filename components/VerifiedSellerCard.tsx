import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, MapPin, Star, Shield, Zap, Phone } from 'lucide-react';
import type { Store } from '@/types';
import { getStoreBannerImage } from '@/utils/storeBanner';
import { StoreBannerPreviewModal } from '@/components/StoreBannerPreviewModal';

type VerifiedSellerCardProps = {
  store: Store;
  categoryBannerIndex?: number;
};

const truncateWords = (value: string, maxWords = 6) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const renderRatingStars = (rating: number) =>
  Array.from({ length: 5 }, (_, index) => {
    const filled = Math.round(rating) >= index + 1;

    return (
      <Star
        key={`${rating}-star-${index}`}
        className={`${filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} h-3 w-3 sm:h-4 sm:w-4`}
      />
    );
  });

export default function VerifiedSellerCard({ store, categoryBannerIndex }: VerifiedSellerCardProps) {
  const boostLabel = store.activeBoost?.plan.badgeLabel ?? 'Boost Pro';
  const boostColor = store.activeBoost?.plan.badgeColor ?? '#f97316';
  const showBoost = store.isBoosted;
  const hasSubscription = !!store.activeSubscription;

  const topBadge = showBoost
    ? {
        color: boostColor,
        icon: <Zap className="h-3 w-3" />,
        text: boostLabel,
      }
    : store.isVerified
      ? {
          color: '#0ea5e9',
          icon: <Check className="h-3 w-3" />,
          text: 'Trusted seller',
        }
      : null;

  const highlightColor = hasSubscription
    ? '#2563eb'
    : showBoost
      ? boostColor
      : store.isVerified
        ? '#0ea5e9'
        : '#0ea5e9';

  const highlightIcon = hasSubscription
    ? <Check className="h-4 w-4" />
    : store.isVerified
      ? <Shield className="h-4 w-4" />
      : showBoost
        ? <Zap className="h-4 w-4" />
        : null;
  const shortSummary = truncateWords(store.description || store.shortDescription || '', 6);
  const fallbackColor = store.categoryBannerColor ?? '#6366f1';
  const heroImage = getStoreBannerImage({
    storeId: store.id,
    storeBannerImage: store.storeBannerImage,
    resolvedBannerImage: store.banner,
    category: store.category,
    preferredIndex: typeof categoryBannerIndex === 'number' ? categoryBannerIndex : null,
  });
  const [bannerError, setBannerError] = useState(false);
  const [bannerPreviewOpen, setBannerPreviewOpen] = useState(false);
  const showBannerImage = Boolean(heroImage) && !bannerError;
  const bannerImageSrc = showBannerImage && heroImage ? heroImage : undefined;
  const gradientBackground = `linear-gradient(135deg, ${fallbackColor} 0%, ${fallbackColor}cc 45%, #0f172a 100%)`;

  return (
    <>
    <div className="flex aspect-square w-full min-h-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden rounded-[25.6px] border-2 border-slate-700 bg-white shadow-[0_14px_24px_rgba(15,23,42,0.16),0_28px_50px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.18)]">
      <div
        className="relative z-0 h-[40%] min-h-[5.5rem] w-full shrink-0 cursor-zoom-in overflow-hidden transition-[filter] hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
        role="button"
        tabIndex={0}
        onClick={() => setBannerPreviewOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setBannerPreviewOpen(true);
          }
        }}
        aria-label={`View ${store.name} banner larger`}
      >
        {topBadge ? (
          <span
            className="pointer-events-none absolute top-3 left-3 z-[1] inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow sm:px-3 sm:py-1 sm:text-xs"
            style={{
              background: topBadge.color,
              clipPath:
                'polygon(50% 0%, 61% 12%, 78% 5%, 83% 22%, 100% 28%, 88% 44%, 100% 60%, 83% 66%, 78% 83%, 61% 76%, 50% 88%, 39% 76%, 22% 83%, 17% 66%, 0% 60%, 12% 44%, 0% 28%, 17% 22%, 22% 5%, 39% 12%)',
            }}
          >
            {topBadge.icon}
            {topBadge.text}
          </span>
        ) : null}
        {bannerImageSrc ? (
          <Image
            src={bannerImageSrc}
            alt={store.name}
            fill
            className="pointer-events-none object-cover"
            onError={() => setBannerError(true)}
            sizes="(max-width:768px) 100vw, 33vw"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0" style={{ background: gradientBackground }} />
        )}
      </div>
      <div className="relative z-[1] flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-hidden overscroll-none bg-white px-2.5 pb-2.5 pt-2 sm:gap-2 sm:overflow-y-auto sm:overscroll-contain sm:px-3.5 sm:pb-3.5 sm:pt-3 [scrollbar-width:thin]">
        <div className="relative flex min-h-0 shrink-0 items-start gap-2">
          <div className="relative inline-flex flex-shrink-0 items-center">
            <div className="h-12 w-12 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-md sm:h-14 sm:w-14 md:h-[72px] md:w-[72px] md:border-[3px] md:border-white md:shadow-lg">
              <img
                src={store.logo}
                alt={store.name}
                width={72}
                height={72}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>
            {(store.isVerified || showBoost || hasSubscription) && highlightIcon && (
              <span
                className="absolute -right-2 -top-2 inline-flex items-center justify-center p-2 text-white shadow-xl ring-2 ring-white"
                style={{
                  background: highlightColor,
                  clipPath:
                    'polygon(50% 0%, 61% 12%, 78% 5%, 83% 22%, 100% 28%, 88% 44%, 100% 60%, 83% 66%, 78% 83%, 61% 76%, 50% 88%, 39% 76%, 22% 83%, 17% 66%, 0% 60%, 12% 44%, 0% 28%, 17% 22%, 22% 5%, 39% 12%)',
                }}
              >
                {highlightIcon}
              </span>
            )}
          </div>
          <div className="mt-0.5 min-w-0 flex-1">
            <h3 className="line-clamp-2 break-words text-[12px] font-semibold leading-tight text-slate-950 sm:text-[18px]">
              {store.name}
            </h3>
            <div className="mt-1 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <div className="flex items-center gap-px">
                {renderRatingStars(store.rating)}
              </div>
              <span className="text-[10px] font-semibold text-slate-700 sm:text-sm">
                {store.totalReviews} reviews
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <p className="line-clamp-2 break-words text-[10px] leading-snug text-slate-700 sm:text-sm">{shortSummary}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1 text-[10px] font-medium text-slate-700 sm:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-2.5 w-2.5 flex-shrink-0 text-slate-500 sm:h-4 sm:w-4" />
            <span className="line-clamp-2 break-words">{store.location}</span>
          </span>
          {store.showPhone !== false && store.whatsapp && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-2.5 w-2.5 flex-shrink-0 text-slate-500 sm:h-4 sm:w-4" />
              <span className="break-words">{store.whatsapp}</span>
            </span>
          )}
        </div>
        <div className="mt-auto flex w-full shrink-0 justify-center pt-0">
          <Link
            href={`/store/${store.username}`}
            className="inline-flex w-full max-w-[80%] min-h-[1.8rem] origin-center scale-95 items-center justify-center gap-1.5 rounded-xl bg-blue-900 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-950 sm:min-h-0 sm:max-w-sm sm:scale-100 sm:py-2 sm:text-sm"
          >
            Visit store
          </Link>
        </div>
      </div>
    </div>
    <StoreBannerPreviewModal
      open={bannerPreviewOpen}
      onClose={() => setBannerPreviewOpen(false)}
      imageSrc={bannerImageSrc}
      fallbackStyle={{ background: gradientBackground }}
      storeName={store.name}
    />
    </>
  );
}
