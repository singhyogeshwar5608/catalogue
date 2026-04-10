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
        className={`${filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} h-5 w-5`}
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
    <div className="flex h-full flex-col overflow-hidden rounded-[25.6px] border-2 border-slate-700 bg-white shadow-[0_14px_24px_rgba(15,23,42,0.16),0_28px_50px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.18)]">
      <div
        className="relative h-44 w-full shrink-0 cursor-zoom-in overflow-hidden transition-[filter] hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
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
            className="pointer-events-none absolute top-3 left-3 z-[1] inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white shadow"
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
      <StoreBannerPreviewModal
        open={bannerPreviewOpen}
        onClose={() => setBannerPreviewOpen(false)}
        imageSrc={bannerImageSrc}
        fallbackStyle={{ background: gradientBackground }}
        storeName={store.name}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5 pt-10">
        <div className="relative z-10 -mt-14 flex shrink-0 items-start gap-4">
          <div className="relative inline-flex items-center flex-shrink-0">
            <div className="h-20 w-20 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg">
              <Image src={store.logo} alt={store.name} width={80} height={80} className="h-full w-full object-cover" />
            </div>
            {(store.isVerified || showBoost || hasSubscription) && highlightIcon && (
              <span
                className="absolute -right-3 -top-3 inline-flex items-center justify-center p-2.5 text-white shadow-xl ring-2 ring-white"
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
          <div className="mt-3 min-w-0 flex-1">
            <h3 className="break-words text-[1.9rem] font-bold leading-tight text-slate-950 line-clamp-2">{store.name}</h3>
            <div className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="flex items-center gap-0.5">
                {renderRatingStars(store.rating)}
              </div>
              <span className="text-[15px] font-semibold text-slate-700">
                {store.totalReviews} reviews
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 space-y-3">
          <p className="line-clamp-2 break-words text-[1rem] leading-7 text-slate-700">{shortSummary}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 text-[15px] font-medium text-slate-700">
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-[18px] w-[18px] flex-shrink-0 text-slate-500" />
            <span className="line-clamp-1 break-words">{store.location}</span>
          </span>
          {store.showPhone !== false && store.whatsapp && (
            <span className="inline-flex items-center gap-2">
              <Phone className="h-[18px] w-[18px] flex-shrink-0 text-slate-500" />
              <span className="break-words">{store.whatsapp}</span>
            </span>
          )}
        </div>
        <div className="mt-auto flex w-full shrink-0 justify-center pt-1">
          <Link
            href={`/store/${store.username}`}
            className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-blue-900 py-3 text-base font-semibold text-white transition hover:bg-blue-950"
          >
            Visit store
          </Link>
        </div>
      </div>
    </div>
  );
}
