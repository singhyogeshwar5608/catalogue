<<<<<<< HEAD
import { Fragment, useMemo, useState } from 'react';
=======
import { useMemo, useState } from 'react';
>>>>>>> origin/main
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
<<<<<<< HEAD
  const badgeIconClass = isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <Fragment>
    <div
      className={`flex aspect-square w-full min-h-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden rounded-[14.4px] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] ${
=======
  const badgeIconClass = isCompact ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5';

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-[14.4px] shadow-[0_14px_40px_rgba(15,23,42,0.08)] bg-white ${
>>>>>>> origin/main
        isCompact ? 'border border-slate-700' : 'border border-slate-200'
      }`}
    >
      <div
<<<<<<< HEAD
        className={`relative z-0 h-[40%] min-h-[4.5rem] w-full shrink-0 cursor-zoom-in overflow-hidden transition-[filter] hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400`}
=======
        className={`relative w-full shrink-0 cursor-zoom-in overflow-hidden transition-[filter] hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${isCompact ? 'h-24' : 'h-44'}`}
>>>>>>> origin/main
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
<<<<<<< HEAD
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/70"></div>
        </>

        <div
          className={`pointer-events-none absolute ${isCompact ? 'bottom-[-10px] left-2 z-[3]' : 'bottom-4 left-4 z-[2]'}`}
        >
=======
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/70" />
        </>

        <div className={`pointer-events-none absolute ${isCompact ? 'bottom-1 left-2' : 'bottom-4 left-4'}`} style={{ zIndex: 2 }}>
>>>>>>> origin/main
          <div className="relative inline-flex items-center">
            <img
              src={store.logo}
              alt={store.name}
<<<<<<< HEAD
              width={isCompact ? 48 : 56}
              height={isCompact ? 48 : 56}
              className={`${isCompact ? 'h-12 w-12 rounded-lg' : 'rounded-xl'} border-2 border-white shadow-lg object-cover`}
=======
              width={isCompact ? 58 : 56}
              height={isCompact ? 58 : 56}
              className={`${isCompact ? 'mt-1 h-[58px] w-[58px] rounded-xl' : 'rounded-xl'} border-2 border-white shadow-lg object-cover`}
>>>>>>> origin/main
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
<<<<<<< HEAD
            {isCompact && isProPlan && (
              <span className="absolute -left-1.5 -bottom-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white shadow-lg">
                Pro
              </span>
            )}
            {isCompact && (store.isVerified || store.activeSubscription) && (
              <span
                className={`absolute inline-flex items-center justify-center rounded-full text-white shadow-xl ring-2 ring-white ${badgePositionClass} ${
=======
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
>>>>>>> origin/main
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
<<<<<<< HEAD
        </div>
      </div>

      <div
        className={`relative z-[1] flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden bg-white [scrollbar-width:thin] ${isCompact ? 'gap-1 p-1 overflow-y-hidden overscroll-none' : 'gap-2.5 p-3.5 overflow-y-auto overscroll-contain'}`}
      >
        <div
          className={`flex shrink-0 ${isCompact ? 'items-start gap-1.5 pt-2' : 'items-center gap-2 pt-1'}`}
        >
          {!isCompact ? (
            <div className="relative inline-flex shrink-0 items-center self-start">
              {isProPlan && (
                <span className="absolute -left-3 -bottom-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
                  Pro
                </span>
              )}
              {(store.isVerified || store.activeSubscription) && (
                <span
                  className={`absolute inline-flex items-center justify-center rounded-full text-white shadow-xl ring-2 ring-white ${badgePositionClass} ${
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
          ) : null}
          <div className={`min-w-0 ${isCompact ? 'w-full flex-1' : 'flex-1'}`}>
            <div
              className={`flex w-full min-w-0 max-w-full flex-wrap items-start gap-1 font-semibold leading-tight text-slate-900 ${
                isCompact ? 'text-[12px]' : 'text-[18px]'
              }`}
            >
              <span className={`min-w-0 max-w-full flex-1 basis-[min(100%,12rem)] ${isCompact ? 'line-clamp-2 break-words' : 'break-words'}`}>
=======
          <div className="flex-1 min-w-0">
            <div
              className={`flex flex-wrap items-start gap-2 font-semibold text-slate-900 ${
                isCompact ? 'text-sm' : 'text-lg'
              }`}
            >
              <span className={`min-w-0 flex-1 basis-[min(100%,12rem)] ${isCompact ? 'line-clamp-2' : 'break-words'}`}>
>>>>>>> origin/main
                {store.name}
              </span>
              {distanceLabel && (
                <span className={`ml-auto rounded-full bg-slate-100 font-semibold text-slate-600 ${
<<<<<<< HEAD
                isCompact ? 'px-1 py-0.5 text-[7px]' : 'px-2.5 py-0.5 text-[11px]'
=======
                isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-3 py-1 text-[11px]'
>>>>>>> origin/main
              }`}>
                {distanceLabel}
              </span>
              )}
              {displayedVerificationBadges.length > 0 && (
<<<<<<< HEAD
                <div className={`flex flex-wrap items-center gap-1 ${isCompact ? 'text-[7px]' : 'text-xs'} text-slate-600`}>
                  {displayedVerificationBadges.map(({ label, icon: Icon }) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-0.5 rounded-full bg-slate-100 font-semibold ${isCompact ? 'px-1.5 py-px' : 'px-2 py-0.5'}`}
                    >
                      <Icon className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} text-emerald-500`} />
=======
                <div className={`flex flex-wrap items-center gap-1.5 ${isCompact ? 'text-[10px]' : 'text-xs'} text-slate-600`}>
                  {displayedVerificationBadges.map(({ label, icon: Icon }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold"
                    >
                      <Icon className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-emerald-500`} />
>>>>>>> origin/main
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {!isCompact ? (
<<<<<<< HEAD
              <p className="mt-0 text-sm leading-tight text-slate-500 break-words">{categoryLabel}</p>
            ) : (
              <div className="mt-0 flex w-full min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[9px]">
                <RatingStars rating={Number(store.rating) || 0} size="2xs" />
                <span className="shrink-0 text-[9px] font-semibold tabular-nums text-slate-900">
                  {Number(store.rating || 0).toFixed(1)}
                </span>
                <span className="shrink-0 text-[9px] text-slate-500">({store.totalReviews})</span>
=======
              <p className="text-sm text-slate-500 break-words">{categoryLabel}</p>
            ) : (
              <div className="mt-0.5 flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <RatingStars rating={Number(store.rating) || 0} size="xs" />
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900">
                  {Number(store.rating || 0).toFixed(1)}
                </span>
                <span className="shrink-0 text-xs text-slate-500">({store.totalReviews})</span>
>>>>>>> origin/main
              </div>
            )}
          </div>
        </div>

        {!isCompact ? (
<<<<<<< HEAD
          <p className="mt-0.5 shrink-0 break-words text-sm leading-snug text-slate-600">{store.shortDescription}</p>
        ) : null}

        <div
          className={`flex shrink-0 ${isCompact ? 'flex-col items-start gap-0.5 text-[9px]' : 'items-center justify-between gap-2 text-sm'}`}
        >
          {!isCompact ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-slate-900">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
=======
          <p className="shrink-0 break-words text-sm text-slate-600">{store.shortDescription}</p>
        ) : null}

        <div
          className={`flex shrink-0 ${isCompact ? 'flex-col items-start gap-1 text-xs' : 'items-center justify-between text-sm'}`}
        >
          {!isCompact ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-slate-900">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
>>>>>>> origin/main
                <RatingStars rating={Number(store.rating) || 0} size="sm" />
                <span className="font-semibold tabular-nums">{Number(store.rating || 0).toFixed(1)}</span>
                <span className="text-slate-500">({store.totalReviews})</span>
              </div>
              {store.trustSeal ? (
<<<<<<< HEAD
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600">
=======
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600">
>>>>>>> origin/main
                  <ShieldCheck className="h-3.5 w-3.5" />
                  TrustSeal
                </span>
              ) : null}
            </div>
          ) : null}
          <div
<<<<<<< HEAD
            className={`flex gap-0.5 ${isCompact ? 'w-full min-w-0 max-w-full items-start text-[9px] text-black' : 'items-center text-slate-500'}`}
          >
            <MapPin
              className={`${isCompact ? 'mt-px h-2.5 w-2.5 text-black' : 'mt-px h-4 w-4'} flex-shrink-0`}
            />
            <span className={`${isCompact ? 'line-clamp-2 break-words' : 'break-words'} min-w-0 max-w-full`}>{store.location}</span>
          </div>
        </div>

        {(displayedVerificationBadges.length > 0 || store.trustSeal) ? (
          <div
            className={`flex shrink-0 flex-wrap items-center gap-1 ${isCompact ? 'text-[7px]' : 'text-xs'} text-slate-600`}
=======
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
>>>>>>> origin/main
          >
            {displayedVerificationBadges.map(({ label, icon: Icon }) => (
              <span
                key={label}
<<<<<<< HEAD
                className={`inline-flex items-center gap-0.5 rounded-full bg-slate-100 font-semibold ${isCompact ? 'px-1.5 py-px' : 'px-2 py-0.5'}`}
              >
                <Icon className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} text-emerald-500`} />
=======
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold"
              >
                <Icon className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-emerald-500`} />
>>>>>>> origin/main
                <span>{label}</span>
              </span>
            ))}
            {isCompact && store.trustSeal ? (
<<<<<<< HEAD
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-px font-semibold text-amber-600">
                <ShieldCheck className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}`} />
=======
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-600">
                <ShieldCheck className={`${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />
>>>>>>> origin/main
                TrustSeal
              </span>
            ) : null}
          </div>
        ) : null}

<<<<<<< HEAD
        <div className="mt-auto flex shrink-0 justify-center pt-0">
          {isCompact ? (
            <Link
              href={`/store/${store.username}`}
              className="inline-flex w-full max-w-[8.25rem] min-h-[1.6rem] origin-center scale-95 items-center justify-center gap-1 rounded-lg bg-blue-900 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-950"
            >
              <ArrowUpRight className="h-3 w-3 shrink-0" />
=======
        <div className="mt-auto flex shrink-0 justify-center pt-1">
          {isCompact ? (
            <Link
              href={`/store/${store.username}`}
              className="inline-flex w-full max-w-[9rem] items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-blue-700"
            >
              <ArrowUpRight className="h-3 w-3" />
>>>>>>> origin/main
              Visit
            </Link>
          ) : (
            <Link
              href={`/store/${store.username}`}
<<<<<<< HEAD
              className="flex w-full max-w-sm items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
=======
              className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
>>>>>>> origin/main
            >
              Visit store
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </div>
<<<<<<< HEAD
    <StoreBannerPreviewModal
      open={bannerPreviewOpen}
      onClose={() => setBannerPreviewOpen(false)}
      imageSrc={heroBannerImage ?? undefined}
      fallbackStyle={heroBannerImage ? undefined : { ...fallbackGradientStyle }}
      storeName={store.name}
    />
    </Fragment>
=======
>>>>>>> origin/main
  );
}
