import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Store } from '@/types';
import { MapPin, Check, ArrowUpRight, BadgeCheck, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import RatingStars from '@/components/RatingStars';
import BoostBadge from './BoostBadge';
import { getStoreBannerImage } from '@/utils/storeBanner';
import { StoreBannerPreviewModal } from '@/components/StoreBannerPreviewModal';

interface StoreCardProps {
  store: Store;
  isCompact?: boolean;
  categoryBannerIndex?: number;
}

export default function StoreCard({ store, isCompact = false, categoryBannerIndex }: StoreCardProps) {
  const [bannerPreviewOpen, setBannerPreviewOpen] = useState(false);
  const categoryLabel = store.categoryName ?? store.businessType ?? 'General';
  const planIdentifier = store.activeSubscription?.plan?.slug?.toLowerCase()
    ?? store.activeSubscription?.plan?.name?.toLowerCase()
    ?? '';
  const isProPlan = planIdentifier.includes('pro');
  const distanceLabel = typeof store.distanceKm === 'number'
    ? `${store.distanceKm < 1 ? `${(store.distanceKm * 1000).toFixed(0)} m` : `${store.distanceKm.toFixed(1)} km`} away`
    : null;

  const verificationBadges = useMemo(() => {
    const items: Array<{ label: string; icon: typeof BadgeCheck }> = [];
    if (store.gstVerified) items.push({ label: 'GST', icon: BadgeCheck });
    if (store.emailVerified) items.push({ label: 'Email', icon: Mail });
    if (store.mobileVerified || store.showPhone) items.push({ label: 'Mobile', icon: Phone });
    if (typeof store.membershipYears === 'number' && store.membershipYears > 0) items.push({ label: `Member · ${store.membershipYears} yrs`, icon: UserRound });
    return items;
  }, [store.gstVerified, store.emailVerified, store.mobileVerified, store.showPhone, store.membershipYears]);

  const displayedVerificationBadges = useMemo(
    () =>
      isCompact ? verificationBadges.filter((b) => b.label !== 'Mobile') : verificationBadges,
    [verificationBadges, isCompact],
  );

  const heroBannerImage = useMemo(() => {
    return getStoreBannerImage({
      storeId: store.id,
      storeBannerImage: store.storeBannerImage,
      resolvedBannerImage: store.banner,
      category: store.category,
      preferredIndex: typeof categoryBannerIndex === 'number' ? categoryBannerIndex : null,
    });
  }, [store.id, store.storeBannerImage, store.banner, store.category, categoryBannerIndex]);

  const fallbackGradientStyle = useMemo(() => {
    const baseColor = store.categoryBannerColor ?? '#1e40af';
    return {
      background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}cc 50%, #0f172a 100%)`,
    } as const;
  }, [store.categoryBannerColor]);

  const badgePositionClass = isCompact ? '-right-2 -top-2 p-1.5' : '-right-3 -top-3 p-1.5';
  const badgeIconClass = isCompact ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5';

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-[14.4px] shadow-[0_14px_40px_rgba(15,23,42,0.08)] bg-white ${
        isCompact ? 'border border-slate-700' : 'border border-slate-200'
      }`}
    >
      <div
        className={`relative w-full shrink-0 cursor-zoom-in overflow-hidden transition-[filter] hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${isCompact ? 'h-24' : 'h-44'}`}
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
        {store.isBoosted && (
          <div className={`pointer-events-none absolute z-10 ${isCompact ? 'top-2 left-2 scale-90 origin-top-left' : 'top-4 left-4'}`}>
            <BoostBadge />
          </div>
        )}

        <>
          {heroBannerImage ? (
            <Image
              src={heroBannerImage}
              alt={`${store.name} banner`}
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="pointer-events-none object-cover"
              priority={false}
            />
          ) : (
            <div className="pointer-events-none absolute inset-0" style={fallbackGradientStyle} />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/70" />
        </>

        <div className={`pointer-events-none absolute ${isCompact ? 'bottom-1 left-2' : 'bottom-4 left-4'}`} style={{ zIndex: 2 }}>
          <div className="relative inline-flex items-center">
            <img
              src={store.logo}
              alt={store.name}
              width={isCompact ? 58 : 56}
              height={isCompact ? 58 : 56}
              className={`${isCompact ? 'mt-1 h-[58px] w-[58px] rounded-xl' : 'rounded-xl'} border-2 border-white shadow-lg object-cover`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
      <StoreBannerPreviewModal
        open={bannerPreviewOpen}
        onClose={() => setBannerPreviewOpen(false)}
        imageSrc={heroBannerImage ?? undefined}
        fallbackStyle={heroBannerImage ? undefined : { ...fallbackGradientStyle }}
        storeName={store.name}
      />

      <div
        className={`flex min-h-0 flex-1 flex-col ${isCompact ? 'gap-2 p-2' : 'gap-4 p-5'}`}
      >
        <div className={`flex shrink-0 ${isCompact ? 'items-start gap-2' : 'items-center gap-3'}`}>
          <div className="relative inline-flex items-center" style={{ marginTop: isCompact ? '-24px' : '-52px' }}>
            {isProPlan && (
              <span className={`absolute inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg ${
                isCompact
                  ? '-left-1.5 -bottom-1.5 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide'
                  : '-left-3 -bottom-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide'
              }`}>
                Pro
              </span>
            )}
            {(store.isVerified || store.activeSubscription) && (
              <span
                className={`absolute inline-flex items-center justify-center rounded-full text-white shadow-xl ring-2 ring-white ${
                  badgePositionClass
                } ${
                  store.activeSubscription ? 'bg-blue-600' : 'bg-sky-500'
                }`}
                style={{
                  clipPath:
                    'polygon(50% 0%, 61% 12%, 78% 5%, 83% 22%, 100% 28%, 88% 44%, 100% 60%, 83% 66%, 78% 83%, 61% 76%, 50% 88%, 39% 76%, 22% 83%, 17% 66%, 0% 60%, 12% 44%, 0% 28%, 17% 22%, 22% 5%, 39% 12%)',
                }}
                title={store.activeSubscription ? `Subscribed: ${store.activeSubscription.plan.name}` : 'Verified Store'}
              >
                <Check className={badgeIconClass} />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className={`flex flex-wrap items-start gap-2 font-semibold text-slate-900 ${
                isCompact ? 'text-sm' : 'text-lg'
              }`}
            >
              <span className={`min-w-0 flex-1 basis-[min(100%,12rem)] ${isCompact ? 'line-clamp-2' : 'break-words'}`}>
                {store.name}
              </span>
              {distanceLabel && (
                <span className={`ml-auto rounded-full bg-slate-100 font-semibold text-slate-600 ${
                isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px]'
              }`}>
                {distanceLabel}
              </span>
              )}
              {displayedVerificationBadges.length > 0 && (
                <div className={`flex flex-wrap items-center gap-1.5 ${isCompact ? 'text-[10px]' : 'text-xs'} text-slate-600`}>
                  {displayedVerificationBadges.map(({ label, icon: Icon }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold"
                    >
                      <Icon className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-emerald-500`} />
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {!isCompact ? (
              <p className="text-sm text-slate-500 break-words">{categoryLabel}</p>
            ) : (
              <div className="mt-0.5 flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <RatingStars rating={Number(store.rating) || 0} size="xs" />
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900">
                  {Number(store.rating || 0).toFixed(1)}
                </span>
                <span className="shrink-0 text-xs text-slate-500">({store.totalReviews})</span>
              </div>
            )}
          </div>
        </div>

        {!isCompact ? (
          <p className="shrink-0 break-words text-sm text-slate-600">{store.shortDescription}</p>
        ) : null}

        <div
          className={`flex shrink-0 ${isCompact ? 'flex-col items-start gap-1 text-xs' : 'items-center justify-between text-sm'}`}
        >
          {!isCompact ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-slate-900">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <RatingStars rating={Number(store.rating) || 0} size="sm" />
                <span className="font-semibold tabular-nums">{Number(store.rating || 0).toFixed(1)}</span>
                <span className="text-slate-500">({store.totalReviews})</span>
              </div>
              {store.trustSeal ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  TrustSeal
                </span>
              ) : null}
            </div>
          ) : null}
          <div
            className={`flex gap-1 ${isCompact ? 'w-full min-w-0 items-start text-xs text-black' : 'items-center text-slate-500'}`}
          >
            <MapPin
              className={`${isCompact ? 'mt-0.5 h-3 w-3 text-black' : 'h-4 w-4'} flex-shrink-0`}
            />
            <span className="min-w-0 break-words">{store.location}</span>
          </div>
        </div>

        {displayedVerificationBadges.length > 0 || store.trustSeal ? (
          <div
            className={`flex shrink-0 flex-wrap items-center gap-1.5 ${isCompact ? 'text-[10px]' : 'text-xs'} text-slate-600`}
          >
            {displayedVerificationBadges.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold"
              >
                <Icon className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-emerald-500`} />
                <span>{label}</span>
              </span>
            ))}
            {isCompact && store.trustSeal ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-600">
                <ShieldCheck className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
                TrustSeal
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex shrink-0 justify-center pt-1">
          {isCompact ? (
            <Link
              href={`/store/${store.username}`}
              className="inline-flex w-full max-w-[9rem] items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-700"
            >
              <ArrowUpRight className="h-3 w-3" />
              Visit
            </Link>
          ) : (
            <Link
              href={`/store/${store.username}`}
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Visit store
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
