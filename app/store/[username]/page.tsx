"use client";

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StoreView from '@/components/store/StoreView';
import PublicStorefrontAccessGate from '@/components/PublicStorefrontAccessGate';
import type { Store, Product, Review, Service, RatingSummary, ReviewPagination } from '@/types';
import { getProductsByStore, getServicesByStore, getStoreBySlugFromApi, getStoreReviews, submitStoreReview, isApiError } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';

interface StorePageProps {
  params: Promise<{ username: string }>;
}

export default function StorePage({ params }: StorePageProps) {
  const { username } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<RatingSummary | null>(null);
  const [reviewPagination, setReviewPagination] = useState<ReviewPagination | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStoreReviews = useCallback(
    async (storeId: string, page = 1, append = false) => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const response = await getStoreReviews(storeId, { page, perPage: 5 });
        setReviewSummary(response.summary);
        setReviewPagination(response.pagination);
        setReviewPage(page);
        setReviews((previous) => (append ? [...previous, ...response.reviews] : response.reviews));
      } catch (err) {
        setReviewsError(
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

  const handleLoadMoreReviews = useCallback(() => {
    if (!store || !reviewPagination?.hasMore || reviewsLoading) return;
    const nextPage = reviewPage + 1;
    fetchStoreReviews(store.id, nextPage, true);
  }, [store, reviewPagination?.hasMore, reviewsLoading, reviewPage, fetchStoreReviews]);

  const handleSubmitStoreReview = useCallback(
    async (payload: { rating: number; comment: string }) => {
      if (!store?.id) {
        throw new Error('Store not available');
      }

      const response = await submitStoreReview(store.id, payload);

      setReviews((previous) => {
        const filtered = previous.filter((review) => review.id !== response.review.id);
        return [response.review, ...filtered];
      });
      setReviewSummary(response.summary);
      setReviewPagination((previous) =>
        previous
          ? {
              ...previous,
              total: response.summary.totalReviews,
            }
          : previous
      );
    },
    [store]
  );

  useEffect(() => {
    let isMounted = true;
    const fetchStore = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedStore = await getStoreBySlugFromApi(username);
        const fetchedProducts = await getProductsByStore(fetchedStore.id);
        let fetchedServices: Service[] = [];
        if (fetchedStore?.id) {
          try {
            fetchedServices = await getServicesByStore(fetchedStore.id);
          } catch (serviceError) {
            console.warn('Unable to load services', serviceError);
          }
        }
        if (!isMounted) return;
        setStore(fetchedStore ?? null);
        setProducts(fetchedProducts ?? []);
        setServices(fetchedServices ?? []);
        if (fetchedStore?.id) {
          fetchStoreReviews(fetchedStore.id);
        } else {
          setReviews([]);
          setReviewSummary(null);
          setReviewPagination(null);
        }
      } catch (err) {
        if (!isMounted) return;
        if (isApiError(err)) {
          if (err.status === 401) {
            router.replace('/login');
            return;
          }
          setError(err.message || 'Unable to load store');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load store');
        }
        setStore(null);
        setProducts([]);
        setServices([]);
        setReviews([]);
        setReviewSummary(null);
        setReviewPagination(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStore();

    return () => {
      isMounted = false;
    };
  }, [username, router, fetchStoreReviews]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading store...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Store unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Store Not Found</h1>
          <p className="text-gray-600">The store you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return (
    <PublicStorefrontAccessGate store={store} user={user}>
      <StoreView
        store={store}
        products={products}
        services={services}
        reviews={reviews}
        reviewSummary={reviewSummary ?? undefined}
        reviewPagination={reviewPagination ?? undefined}
        reviewsLoading={reviewsLoading}
        reviewsError={reviewsError}
        onLoadMoreReviews={handleLoadMoreReviews}
        onSubmitStoreReview={handleSubmitStoreReview}
      />
    </PublicStorefrontAccessGate>
  );
}
