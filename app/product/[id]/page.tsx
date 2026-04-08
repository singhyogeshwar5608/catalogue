"use client";

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCart,
  Star,
  Truck,
  ShieldCheck,
  Heart,
  Package,
  Clock3,
  Store as StoreIcon,
  ArrowUpRight,
  MessageCircle,
  Phone,
  ChevronLeft,
  Check,
  CreditCard,
} from 'lucide-react';
import type { Product, Store, Review, RatingSummary, ReviewPagination } from '@/types';
import { getProductById, getProductReviews, submitProductReview, isApiError } from '@/src/lib/api';
import RatingStars from '@/components/RatingStars';
import ReviewCard from '@/components/ReviewCard';
import { useAuth } from '@/src/context/AuthContext';
import { buildReviewColors, getThemeForCategory } from '@/src/lib/reviewTheme';

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = use(params);
  const { isLoggedIn } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<RatingSummary | null>(null);
  const [reviewPagination, setReviewPagination] = useState<ReviewPagination | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewForm, setReviewForm] = useState<{ rating: number; comment: string }>({ rating: 0, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const themeKey = store?.businessType || product?.category;
  const theme = useMemo(() => getThemeForCategory(themeKey), [themeKey]);
  const reviewColors = useMemo(() => buildReviewColors(theme), [theme]);
  const approvedReviews = useMemo(() => reviews.filter((review) => review.isApproved !== false), [reviews]);
  const ratingBreakdown = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    approvedReviews.forEach((review) => {
      const star = Math.min(5, Math.max(1, Math.round(review.rating || 0))) as 1 | 2 | 3 | 4 | 5;
      counts[star] += 1;
    });
    return counts;
  }, [approvedReviews]);
  const totalRecordedReviews = useMemo(
    () => Object.values(ratingBreakdown).reduce((sum, count) => sum + count, 0),
    [ratingBreakdown]
  );
  const aggregateRating = reviewSummary?.rating ?? product?.rating ?? 0;

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const { product: fetchedProduct, store: fetchedStore } = await getProductById(id);
        if (!isMounted) return;
        setProduct(fetchedProduct);
        setStore(fetchedStore);
        setRelatedProducts([]);
        await fetchReviews(id, 1);
      } catch (err) {
        if (!isMounted) return;
        if (isApiError(err)) {
          setError(err.message || 'Unable to load product');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load product');
        }
        setProduct(null);
        setStore(null);
        setRelatedProducts([]);
        setReviews([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const fetchReviews = useCallback(
    async (productId: string, page = 1, append = false) => {
      setReviewsLoading(true);
      setReviewError(null);
      try {
        const response = await getProductReviews(productId, { page, perPage: 5 });
        setReviewSummary(response.summary);
        setReviewPagination(response.pagination);
        setReviewPage(page);
        setReviews((previous) => (append ? [...previous, ...response.reviews] : response.reviews));
      } catch (err) {
        setReviewError(
          isApiError(err)
            ? err.message || 'Unable to load reviews'
            : err instanceof Error
              ? err.message
              : 'Unable to load reviews'
        );
      } finally {
        setReviewsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!product?.id) return;
    fetchReviews(product.id, 1);
  }, [product?.id, fetchReviews]);

  const discount = useMemo(() => {
    if (!product || !product.originalPrice) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  }, [product]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const extraImages = Array.isArray(product.images) ? product.images : [];
    return [product.image, ...extraImages].filter(Boolean).slice(0, 4);
  }, [product]);

  const sellerPhone = store?.whatsapp?.replace(/[^0-9+]/g, '') ?? '';
  const whatsappLink = store ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}` : '#';

  const handleReviewFormChange = (partial: Partial<typeof reviewForm>) => {
    setReviewForm((previous) => ({ ...previous, ...partial }));
  };

  const handleSubmitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;
    if (!isLoggedIn) {
      setReviewError('Please log in to submit a review.');
      return;
    }
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
      const response = await submitProductReview(product.id, {
        rating: reviewForm.rating,
        comment: trimmedComment,
      });

      setReviews((previous) => {
        const filtered = previous.filter((item) => item.id !== response.review.id);
        return [response.review, ...filtered];
      });
      setReviewSummary(response.summary);
      setReviewForm({ rating: 0, comment: '' });
    } catch (err) {
      setReviewError(
        isApiError(err)
          ? err.message || 'Unable to submit review'
          : err instanceof Error
            ? err.message
            : 'Unable to submit review'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const [selectedPackage, setSelectedPackage] = useState('single');

  const handleLoadMoreReviews = () => {
    if (!product || !reviewPagination?.hasMore || reviewsLoading) return;
    const nextPage = reviewPage + 1;
    fetchReviews(product.id, nextPage, true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Product not found</h1>
          <p className="text-gray-600">This item may have been removed. Please explore the store for other products.</p>
        </div>
      </div>
    );
  }

  const unitBaseLabel = product.unitCustomLabel?.trim() || product.unitType?.replace(/_/g, ' ') || null;
  const formattedUnitLabel = unitBaseLabel
    ? product.unitQuantity && product.unitQuantity > 0
      ? `${product.unitQuantity} ${unitBaseLabel}`
      : unitBaseLabel
    : null;

  const productDescription = product.description?.trim() || 'Description will appear here when the seller or admin adds product details.';

  const purchaseOptions = [
    {
      id: 'single',
      title: 'Single order',
      subtitle: formattedUnitLabel ? `1 × ${formattedUnitLabel}` : 'Standard order option',
      price: product.price,
      helper: product.inStock ? 'Suitable for immediate purchase.' : 'Seller will confirm availability.',
    },
    ...(product.minOrderQuantity && product.minOrderQuantity > 1
      ? [
          {
            id: 'minimum',
            title: 'Minimum quantity',
            subtitle: `${product.minOrderQuantity} ${product.minOrderQuantity === 1 ? 'item' : 'items'}`,
            price: product.price * product.minOrderQuantity,
            helper: 'For products with a required minimum order quantity.',
          },
        ]
      : []),
    ...(product.wholesaleEnabled && product.wholesalePrice
      ? [
          {
            id: 'wholesale',
            title: 'Wholesale order',
            subtitle: `${product.wholesaleMinQty ?? Math.max(product.minOrderQuantity ?? 2, 2)}+ items`,
            price: product.wholesalePrice * (product.wholesaleMinQty ?? Math.max(product.minOrderQuantity ?? 2, 2)),
            helper: `Bulk pricing at ₹${product.wholesalePrice.toFixed(0)} per item.`,
          },
        ]
      : []),
  ];

  const activePurchaseId = purchaseOptions.some((option) => option.id === selectedPackage)
    ? selectedPackage
    : (purchaseOptions[0]?.id ?? 'single');

  const selectedPurchaseOption = purchaseOptions.find((option) => option.id === activePurchaseId) ?? purchaseOptions[0];

  const trustHighlights = [
    {
      icon: ShieldCheck,
      title: store?.isVerified ? 'Verified seller' : 'Trusted seller',
      copy: store?.isVerified ? 'Store profile checked by Catelog.' : 'Direct seller assistance available.',
    },
    {
      icon: Truck,
      title: product.inStock ? 'Fast dispatch' : 'Availability support',
      copy: product.inStock ? 'Seller can process active orders quickly.' : 'Stock is confirmed directly with the seller.',
    },
    {
      icon: CreditCard,
      title: 'Safe buying flow',
      copy: 'Compare details, review the seller, and order confidently.',
    },
  ];

  const minOrderQuantity = product?.minOrderQuantity ?? 0;
  const hasMinimumOrderRequirement = minOrderQuantity > 1;
  const minimumOrderLabel = hasMinimumOrderRequirement
    ? `${minOrderQuantity} ${minOrderQuantity === 1 ? 'item' : 'items'}`
    : null;

  const detailCards = [
    {
      icon: Package,
      title: 'Minimum order',
      value: `${product.minOrderQuantity ?? 1} ${(product.minOrderQuantity ?? 1) === 1 ? 'item' : 'items'}`,
    },
    {
      icon: Clock3,
      title: 'Availability',
      value: product.inStock ? 'Ready to order now' : 'Available on request',
    },
    {
      icon: Truck,
      title: 'Delivery',
      value: 'Delivery and pickup depend on seller location.',
    },
    {
      icon: ShieldCheck,
      title: 'Support',
      value: 'Direct store support before and after purchase.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 lg:max-w-[80%]">
          <Link href="/" className="inline-flex items-center text-slate-900">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50">
              <Heart className="h-4 w-4" />
            </button>
            <Link href="/cart" className="rounded-full border border-slate-200 p-2 text-slate-900 transition hover:bg-slate-50">
              <ShoppingCart className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-8 pt-4 sm:px-6 lg:max-w-[80%]">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <section className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-slate-100">
            <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-slate-100 via-white to-slate-50">
              <Image
                src={product.image || galleryImages[0]}
                alt={product.name}
                fill
                className="object-contain"
                priority
              />
              <div className="absolute inset-x-0 top-4 flex items-start justify-between px-4">
                <div className="flex flex-col gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${
                      product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {product.inStock ? 'In stock' : 'Available on request'}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                      {product.category}
                    </span>
                    {store?.isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified store
                      </span>
                    )}
                  </div>
                </div>
                {discount > 0 && (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 shadow-sm">
                    Save {discount}%
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:h-full">
          <div className="mt-3 space-y-3">
            {hasMinimumOrderRequirement && minimumOrderLabel && (
              <div className="relative overflow-hidden rounded-full bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700 ring-1 ring-emerald-200">
                <span className="absolute inset-0 animate-[pulse_2s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden="true" />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500/80" aria-hidden="true" />
                    Min order requirement
                  </span>
                  <span className="text-[12px] font-bold tracking-normal text-emerald-800 normal-case">
                    {minimumOrderLabel}
                  </span>
                </span>
              </div>
            )}
            <h1 className="text-[30px] font-bold leading-none text-slate-900 sm:text-3xl">{product.name}</h1>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                <StoreIcon className="h-4 w-4 text-slate-400" />
                {store ? (
                  <Link href={`/store/${store.username}`} className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-primary">
                    {store.name}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="font-medium text-slate-700">{product.storeName}</span>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= Math.round(aggregateRating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-slate-900">{aggregateRating.toFixed(1)}</span>
                <a href="#reviews" className="font-medium text-primary underline-offset-4 hover:underline">
                  {(reviewSummary?.totalReviews ?? product.totalReviews).toLocaleString()} reviews
                </a>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_130px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-4xl font-bold leading-none text-slate-900">₹{selectedPurchaseOption ? selectedPurchaseOption.price.toFixed(0) : product.price.toFixed(0)}</span>
                  {product.originalPrice && activePurchaseId === 'single' && (
                    <span className="text-base text-slate-400 line-through">₹{product.originalPrice.toFixed(0)}</span>
                  )}
                </div>
                <p className="mt-1.5 max-w-xs text-sm leading-5 text-slate-500">
                  {formattedUnitLabel ? `Unit: ${formattedUnitLabel}` : 'Final pricing depends on quantity and seller terms.'}
                </p>
              </div>

              <div className="rounded-[22px] bg-gradient-to-br from-slate-50 to-slate-100 px-3 py-3 text-center ring-1 ring-slate-200">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">Seller type</p>
                <p className="mt-1.5 text-[15px] font-semibold leading-5 text-slate-900">
                  {store?.isVerified ? 'Trusted & verified' : 'Direct store listing'}
                </p>
              </div>
            </div>
          </div>

          {product.wholesaleEnabled && product.wholesalePrice && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-[11px] font-semibold text-primary">
              <Package className="h-3.5 w-3.5" />
              Wholesale pricing available
            </div>
          )}

          <div className="mt-5 rounded-3xl bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{productDescription}</p>
          </div>
          </section>
        </div>

        <section className="grid grid-cols-3 gap-3">
          {trustHighlights.map((item) => (
            <div
              key={item.title}
              className="rounded-[28px] bg-slate-950 p-4 text-center shadow-[0_20px_40px_rgba(15,23,42,0.18)] ring-1 ring-slate-800"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-semibold text-white sm:text-sm">{item.title}</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-300 sm:text-xs">{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Choose an order option</h2>
              <p className="mt-1 text-sm text-slate-500">Select the quantity or buying mode that fits your order.</p>
            </div>
            <Package className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {purchaseOptions.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start justify-between gap-3 rounded-3xl border p-4 transition ${
                  activePurchaseId === option.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="orderOption"
                  value={option.id}
                  checked={activePurchaseId === option.id}
                  onChange={() => setSelectedPackage(option.id)}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${activePurchaseId === option.id ? 'border-primary' : 'border-slate-300'}`}>
                    {activePurchaseId === option.id && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{option.subtitle}</p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      {option.helper}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">₹{option.price.toFixed(0)}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {detailCards.map((item) => (
            <div
              key={item.title}
              className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-[0_24px_50px_rgba(15,23,42,0.22)] ring-1 ring-slate-800"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-slate-300">{item.value}</p>
            </div>
          ))}
        </section>

        {store && (
          <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                <Image src={store.logo} alt={store.name} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{store.name}</h2>
                  {store.isVerified && <ShieldCheck className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-sm text-slate-500">{store.location}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {store.shortDescription || store.description || 'Trusted seller profile on Catelog.'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Store rating</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{store.rating.toFixed(1)} / 5</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Reviews</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{store.totalReviews}+ buyers</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/store/${store.username}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Visit store
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              {sellerPhone && (
                <a
                  href={`${whatsappLink}?text=Hi%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(15,118,110,0.25)]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with seller
                </a>
              )}
            </div>
          </section>
        )}

        {relatedProducts.length > 0 && (
          <section className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">More from this category</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Related products</h2>
              </div>
              {store && (
                <Link href={`/store/${store.username}`} className="text-sm font-semibold text-primary">
                  Explore store
                </Link>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {relatedProducts.map((item) => (
                <Link key={item.id} href={`/product/${item.id}`} className="rounded-[24px] border border-slate-200 p-3 transition hover:shadow-md">
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">₹{item.price.toFixed(0)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Reviews Section */}
      <section id="reviews" className="relative isolate mt-12">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[36px] shadow-[0_25px_60px_rgba(15,23,42,0.12)] lg:max-w-[80%]">
          <div className="relative">
            <div className="absolute inset-0" style={{ background: reviewColors.gradient }} aria-hidden="true" />
            <div className="relative px-6 py-12 sm:px-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Product reviews</p>
                  <h2 className="text-3xl font-semibold text-slate-900">Loved by buyers of {product.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Average rating {aggregateRating.toFixed(1)} from {reviewSummary?.totalReviews ?? product.totalReviews} orders.
                  </p>
                </div>
                {isLoggedIn ? (
                  <a
                    href="#write-review-form"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_30px_rgba(15,23,42,0.2)]"
                    style={{ backgroundColor: reviewColors.primary }}
                  >
                    Write a review
                  </a>
                ) : (
                  <span className="text-sm text-slate-600">Sign in to share your experience.</span>
                )}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div
                  className="rounded-3xl bg-white/90 p-6 text-slate-900 shadow-sm"
                  style={{ border: `1px solid ${reviewColors.cardBorder}` }}
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Average rating</p>
                  <div className="mt-4 flex items-end gap-3">
                    <span className="text-6xl font-semibold">{aggregateRating.toFixed(1)}</span>
                    <span className="pb-3 text-sm text-slate-400">/ 5</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-slate-900">
                    <RatingStars rating={aggregateRating} size="md" />
                    <span className="text-sm font-semibold">
                      {totalRecordedReviews || reviewSummary?.totalReviews || product.totalReviews} reviews
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Based on verified shoppers from {store?.location || 'your city'}.</p>
                </div>

                <div
                  className="rounded-3xl bg-white/90 p-6 shadow-sm lg:col-span-2"
                  style={{ border: `1px solid ${reviewColors.cardBorder}` }}
                >
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingBreakdown[star as 1 | 2 | 3 | 4 | 5];
                    const percentage = totalRecordedReviews ? (count / totalRecordedReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 py-1">
                        <span className="w-8 text-sm text-slate-500">{star}.0</span>
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${reviewColors.primary}, ${reviewColors.accent})`,
                            }}
                          />
                        </div>
                        <span className="w-16 text-right text-xs text-slate-500">{count} reviews</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isLoggedIn && (
                <form
                  id="write-review-form"
                  onSubmit={handleSubmitReview}
                  className="mt-8 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-100"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="text-sm font-semibold text-slate-900">Your rating</label>
                    <RatingStars
                      interactive
                      rating={reviewForm.rating}
                      size="lg"
                      onChange={(value) => handleReviewFormChange({ rating: value })}
                    />
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-semibold text-slate-900" htmlFor="review_comment">
                      Share more about your experience
                    </label>
                    <textarea
                      id="review_comment"
                      rows={4}
                      value={reviewForm.comment}
                      onChange={(event) => handleReviewFormChange({ comment: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                      placeholder="Talk about the product quality, delivery, and support…"
                      required
                    />
                  </div>
                  {reviewError && <p className="mt-3 text-sm text-rose-500">{reviewError}</p>}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      style={{ backgroundColor: reviewColors.primary }}
                    >
                      {isSubmittingReview ? 'Submitting…' : 'Submit review'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-8 space-y-4">
                {reviewsLoading && approvedReviews.length === 0 ? (
                  <p className="text-sm text-slate-600">Loading reviews…</p>
                ) : approvedReviews.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
                    Be the first to review this product.
                  </div>
                ) : (
                  approvedReviews.map((review) => <ReviewCard key={review.id} review={review} />)
                )}
              </div>

              {reviewPagination?.hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMoreReviews}
                    disabled={reviewsLoading}
                    className="inline-flex items-center gap-2 rounded-full border px-6 py-2 text-sm font-semibold disabled:opacity-60"
                    style={{ borderColor: reviewColors.cardBorder, color: '#0f172a' }}
                  >
                    {reviewsLoading ? 'Loading…' : 'Load more reviews'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Selected price</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">
                ₹{selectedPurchaseOption ? selectedPurchaseOption.price.toFixed(0) : product.price.toFixed(0)}
              </span>
              {product.originalPrice && activePurchaseId === 'single' && (
                <span className="text-xs text-slate-400 line-through">₹{product.originalPrice.toFixed(0)}</span>
              )}
            </div>
          </div>
          {sellerPhone ? (
            <div className="flex items-center gap-2">
              <a
                href={`tel:${sellerPhone}`}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={`${whatsappLink}?text=Hi%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(15,118,110,0.25)]"
              >
                <MessageCircle className="h-4 w-4" />
                Order now
              </a>
            </div>
          ) : (
            <a
              href="#reviews"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(15,118,110,0.25)]"
            >
              View reviews
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
