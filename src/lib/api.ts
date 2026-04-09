'use client';

import type {
  BoostPlan,
  Product,
  ProductUnitType,
  Review,
  ReviewListResponse,
  Service,
  ServiceBillingUnit,
  Store,
  StoreBoost,
  AdminDashboardStats,
  SubscriptionPlan,
  StoreSubscription,
} from '@/types';
import type {
  BackendBoostPlan,
  BackendProduct,
  BackendService,
  BackendStore,
  BackendStoreBoost,
  BackendReview,
  StoreSummary,
  BackendSearchResponse,
} from '@/types/api';
import { formatStoreName } from '@/src/lib/format';

type ReviewListParams = {
  page?: number;
  perPage?: number;
};

type BackendReviewListResponse = {
  summary: {
    rating?: number;
    total_reviews?: number;
  };
  pagination: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    has_more?: boolean;
  };
  reviews: BackendReview[];
};

export type Category = {
  id: number;
  name: string;
  slug?: string;
  business_type: 'product' | 'service' | 'hybrid';
  is_active?: boolean;
  banner_image?: string | null;
  banner_images?: string[] | null;
  banner_color?: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
  color_combinations?: { color1: string; color2: string }[] | null;
  banner_pattern?: 'waves' | 'diagonal' | 'circles' | null;
};

export type CreateCategoryPayload = {
  name: string;
  slug: string;
  business_type: Category['business_type'];
  is_active: boolean;
  banner_image?: string | null;
  banner_color?: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
};

export type UpdateCategoryBannerPayload = {
  banner_image?: string | null;
  banner_images?: string[] | null;
  banner_color?: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
};

type ReviewSubmitPayload = {
  rating: number;
  comment: string;
};

export const addService = async (payload: AddServicePayload) => {
  const response = await apiRequest<BackendService>('/services', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  return {
    service: normalizeService(response.data, {
      id: Number(response.data.store_id ?? 0),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'product' },
      is_active: true,
      is_verified: false,
    } as BackendStore),
  };
};

export const updateProduct = async (payload: UpdateProductPayload) => {
  const { id, ...rest } = payload;
  const response = await apiRequest<BackendProduct>(`/product/${id}`, {
    method: 'PUT',
    body: rest,
    requiresAuth: true,
  });

  return {
    product: normalizeProduct(response.data, {
      id: Number(response.data.store_id ?? 0),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'product' },
      is_active: true,
      is_verified: false,
    } as BackendStore),
  };
};

export const deleteProduct = async (productId: number | string) => {
  await apiRequest(`/product/${productId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'super_admin';
  storeSlug: string | null;
  stores: StoreSummary[];
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type CreateStorePayload = {
  name: string;
  category_id: number;
  logo?: string | null;
  address: string;
  phone: string;
  show_phone?: boolean;
  description?: string;
  location?: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
};

export type UpdateStorePayload = {
  id: number | string;
  name?: string;
  category_id?: number;
  logo?: string | null;
  address?: string;
  phone?: string;
  show_phone?: boolean;
  description?: string;
  is_verified?: boolean;
  is_active?: boolean;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
};

export type AddProductPayload = {
  title: string;
  price: number;
  original_price?: number;
  category?: string;
  image?: string;
  description?: string;
  is_active?: boolean;
  unit_type?: string;
  unit_custom_label?: string | null;
  unit_quantity?: number | null;
  wholesale_enabled?: boolean;
  wholesale_price?: number | null;
  wholesale_min_qty?: number | null;
  min_order_quantity?: number | null;
  discount_enabled?: boolean;
  discount_price?: number | null;
  discount_schedule_enabled?: boolean;
  discount_starts_at?: string | null;
  discount_ends_at?: string | null;
};

export type UpdateProductPayload = Partial<AddProductPayload> & {
  id: number | string;
};

export type AddServicePayload = {
  store_id: number | string;
  title: string;
  price?: number;
  description?: string;
  image?: string;
  is_active?: boolean;
  billing_unit?: string;
  custom_billing_unit?: string | null;
  min_quantity?: number | null;
  package_price?: number | null;
};

export type SearchAllParams = {
  query: string;
  location?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  types?: Array<'stores' | 'products' | 'services'>;
  limits?: {
    stores?: number;
    products?: number;
    services?: number;
  };
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';
const AUTH_TOKEN_HEADER = 'Authorization';
export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export class ApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

const isBrowser = () => typeof window !== 'undefined';

let authToken: string | null = null;

const ensureAuthToken = () => {
  if (!authToken && isBrowser()) {
    authToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  }
};

const persistAuthToken = (token: string | null) => {
  if (!isBrowser()) return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

const persistAuthUser = (user: ApiUser | null) => {
  if (!isBrowser()) return;
  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_USER_KEY);
  }
};

export const getStoredUser = (): ApiUser | null => {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
  persistAuthToken(token);
};

export const clearAuthToken = () => {
  setAuthToken(null);
};

export const getAuthHeaders = () => {
  ensureAuthToken();
  if (!authToken) return {};
  return { [AUTH_TOKEN_HEADER]: `Bearer ${authToken}` } as Record<string, string>;
};

export const apiRequest = async <T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: Record<string, unknown> | FormData | undefined;
    requiresAuth?: boolean;
  } = {}
): Promise<ApiEnvelope<T>> => {
  const { method = 'GET', body, requiresAuth = false } = options;
  const url = `${API_BASE_URL}${path}`;
  
  // Debug: Log API_BASE_URL and URL
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('Full URL:', url);

  ensureAuthToken();

  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (requiresAuth) {
    if (!authToken) {
      throw new ApiError('Unauthorized', 401);
    }
    headers[AUTH_TOKEN_HEADER] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: payload,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type');
  const responseData = contentType?.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(responseData?.message ?? 'Request failed', response.status, responseData);
  }

  return responseData as ApiEnvelope<T>;
};

const normalizeUser = (user: any): ApiUser => {
  const stores: StoreSummary[] = Array.isArray(user?.stores)
    ? user.stores
        .map((store: any) => ({
          id: String(store?.id ?? ''),
          name: store?.name ?? 'My Store',
          slug: store?.slug ?? '',
        }))
        .filter((store: StoreSummary) => Boolean(store.id && store.slug))
    : [];

  const fallbackStoreSlug =
    user?.storeSlug ??
    user?.store_slug ??
    user?.store?.slug ??
    stores[0]?.slug ??
    null;

  return {
    id: String(user?.id ?? ''),
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: (user?.role as 'user' | 'super_admin') ?? 'user',
    storeSlug: fallbackStoreSlug,
    stores,
  };
};

const fallbackLogo = 'https://images.unsplash.com/photo-1503602642458-232111445657?w=200&h=200&fit=crop';
const fallbackBanner = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&h=400&fit=crop';
const fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop';

const PRODUCT_UNIT_TYPE_VALUES: readonly ProductUnitType[] = [
  'piece',
  'box',
  'pack',
  'set',
  'kilogram',
  'gram',
  'liter',
  'milliliter',
  'meter',
  'centimeter',
  'square_meter',
  'custom',
] as const;

const SERVICE_BILLING_UNIT_VALUES: readonly ServiceBillingUnit[] = [
  'session',
  'hour',
  'day',
  'week',
  'month',
  'project',
  'custom',
] as const;

const isValidProductUnitType = (value: unknown): value is ProductUnitType =>
  typeof value === 'string' && (PRODUCT_UNIT_TYPE_VALUES as readonly string[]).includes(value);

const isValidServiceBillingUnit = (value: unknown): value is ServiceBillingUnit =>
  typeof value === 'string' && (SERVICE_BILLING_UNIT_VALUES as readonly string[]).includes(value);

const toNumber = (value?: string | number | null, defaultValue = 0) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

const normalizeBoostPlan = (plan: BackendBoostPlan): BoostPlan => ({
  id: String(plan.id),
  name: plan.name,
  days: Number(plan.days ?? 0),
  price: Number(plan.price ?? 0),
  priorityWeight: Number(plan.priority_weight ?? 1),
  badgeLabel: plan.badge_label ?? 'Boost Pro',
  badgeColor: plan.badge_color ?? '#fde68a',
  isActive: plan.is_active !== false,
  features: Array.isArray(plan.features) ? plan.features : undefined,
});

const normalizeStoreBoost = (
  boost: BackendStoreBoost,
  options: { includeStore?: boolean } = {}
): StoreBoost => {
  const includeStore = options.includeStore ?? false;
  const normalizedStore = includeStore && boost.store ? normalizeStore(boost.store, { includeActiveBoost: false }) : undefined;

  return {
    id: String(boost.id),
    storeId: String(boost.store_id),
    startsAt: boost.starts_at,
    endsAt: boost.ends_at,
    status: boost.status,
    activatedBy: boost.activated_by ? String(boost.activated_by) : undefined,
    plan: normalizeBoostPlan(boost.plan),
    ...(normalizedStore ? { store: normalizedStore } : {}),
  };
};

const normalizeStore = (
  store: BackendStore,
  options: { includeActiveBoost?: boolean } = {}
): Store => {
  const includeActiveBoost = options.includeActiveBoost ?? true;
  const description = store.description ?? '';
  const businessType = store.business_type ?? store.category?.business_type ?? 'product';
  const categoryName = store.category?.name ?? undefined;
  const shortDescription = store.short_description ?? (description.slice(0, 120) || businessType);
  const ratingRaw = toNumber(store.rating);
  const rating = ratingRaw > 0 ? Number(ratingRaw.toFixed(1)) : 0;
  const totalReviews = Math.max(0, Math.trunc(toNumber(store.total_reviews)));
  const layout = store.layout_type === 'layout2' ? 'layout2' : 'layout1';
  const storeBannerImage = store.banner ?? null;
  const categoryBannerImage = store.category?.banner_image ?? null;
  const categoryBannerColor = store.category?.banner_color ?? null;
  const resolvedBanner = storeBannerImage ?? categoryBannerImage ?? fallbackBanner;
  const activeBoost = includeActiveBoost && store.active_boost
    ? normalizeStoreBoost(store.active_boost, { includeStore: false })
    : null;

  const activeSubscription = (store as any).active_subscription ?? (store as any).activeSubscription ?? null;
  const normalizedSubscription = activeSubscription?.plan
    ? {
        id: String(activeSubscription.id),
        storeId: String(activeSubscription.store_id ?? store.id),
        subscriptionPlanId: String(activeSubscription.subscription_plan_id),
        price: Number(activeSubscription.price ?? 0),
        status: activeSubscription.status ?? 'active',
        startsAt: activeSubscription.starts_at,
        endsAt: activeSubscription.ends_at,
        autoRenew: Boolean(activeSubscription.auto_renew ?? true),
        activatedBy: activeSubscription.activated_by,
        plan: {
          id: String(activeSubscription.plan.id),
          name: activeSubscription.plan.name,
          slug: activeSubscription.plan.slug,
          price: Number(activeSubscription.plan.price ?? 0),
          billingCycle: activeSubscription.plan.billing_cycle ?? 'monthly',
          durationDays: activeSubscription.plan.duration_days ? Number(activeSubscription.plan.duration_days) : undefined,
          maxProducts: Number(activeSubscription.plan.max_products ?? 0),
          isPopular: Boolean(activeSubscription.plan.is_popular),
          isActive: Boolean(activeSubscription.plan.is_active),
          features: Array.isArray(activeSubscription.plan.features) ? activeSubscription.plan.features : [],
          description: activeSubscription.plan.description ?? '',
        },
      }
    : null;

  const normalizedCategory = store.category
    ? {
        id: store.category.id,
        name: store.category.name,
        slug: store.category.slug,
        business_type: store.category.business_type,
        banner_image: store.category.banner_image ?? null,
        banner_images: Array.isArray(store.category.banner_images)
          ? store.category.banner_images.filter((url): url is string => Boolean(url))
          : store.category.banner_images ?? null,
        banner_title: store.category.banner_title ?? null,
        banner_subtitle: store.category.banner_subtitle ?? null,
        banner_color: store.category.banner_color ?? null,
        color_combinations: store.category.color_combinations ?? null,
        banner_pattern: store.category.banner_pattern ?? null,
      }
    : undefined;

  return {
    id: String(store.id),
    username: store.slug,
    name: formatStoreName(store.name),
    logo: store.logo ?? fallbackLogo,
    banner: resolvedBanner,
    storeBannerImage,
    categoryBannerImage,
    categoryBannerColor,
    description,
    shortDescription,
    rating,
    totalReviews,
    isVerified: Boolean(store.is_verified),
    isBoosted: Boolean(store.is_boosted ?? activeBoost !== null),
    isActive: Boolean(store.is_active),
    boostExpiryDate: store.boost_expiry_date ?? activeBoost?.endsAt,
    businessType,
    categoryName,
    categoryId: store.category_id ? String(store.category_id) : undefined,
    themeId: store.theme ?? undefined,
    location: store.location ?? store.address ?? 'Pan India',
    latitude: typeof store.latitude === 'number' ? store.latitude : store.latitude ? Number(store.latitude) : null,
    longitude: typeof store.longitude === 'number' ? store.longitude : store.longitude ? Number(store.longitude) : null,
    distanceKm: typeof store.distance_km === 'number' ? store.distance_km : store.distance_km ? Number(store.distance_km) : null,
    phone: store.phone ?? undefined,
    showPhone: store.show_phone !== false,
    whatsapp: store.whatsapp ?? store.phone ?? '+91 90000 00000',
    socialLinks: {
      facebook: store.facebook_url ?? null,
      instagram: store.instagram_url ?? null,
      youtube: store.youtube_url ?? null,
      linkedin: store.linkedin_url ?? null,
    },
    layoutType: layout,
    createdAt: store.created_at ?? new Date().toISOString(),
    activeBoost,
    activeSubscription: normalizedSubscription,
    productsCount: (store as any).products_count ?? (store.products ? store.products.length : undefined),
    servicesCount: (store as any).services_count ?? undefined,
    user: store.user
      ? {
          id: String(store.user.id),
          name: store.user.name ?? 'Unknown',
          email: store.user.email ?? '',
        }
      : undefined,
    category: normalizedCategory,
    products: store.products
      ? store.products.map((product) => normalizeProduct(product, store))
      : undefined,
    services: store.services
      ? store.services.map((service) => normalizeService(service, store))
      : undefined,
  };
};

const normalizeProduct = (product: BackendProduct, store: BackendStore): Product => {
  const ratingValue = toNumber(product.rating);
  const totalReviews = Math.max(0, Math.trunc(toNumber(product.total_reviews)));
  const baseImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const images = baseImages.length
    ? baseImages
    : product.image
      ? [product.image]
      : [fallbackImage];

  const unitQuantityValue = product.unit_quantity != null ? Number(product.unit_quantity) : null;
  const wholesalePriceValue = product.wholesale_price != null ? Number(product.wholesale_price) : null;
  const wholesaleMinQtyValue = product.wholesale_min_qty != null ? Number(product.wholesale_min_qty) : null;

  let unitQuantity: number | null = null;
  if (unitQuantityValue != null && !Number.isNaN(unitQuantityValue) && unitQuantityValue > 0) {
    unitQuantity = unitQuantityValue;
  }

  let wholesalePrice: number | null = null;
  if (product.wholesale_enabled && wholesalePriceValue != null && !Number.isNaN(wholesalePriceValue)) {
    wholesalePrice = wholesalePriceValue;
  }

  let wholesaleMinQty: number | null = null;
  if (product.wholesale_enabled && wholesaleMinQtyValue != null && !Number.isNaN(wholesaleMinQtyValue)) {
    wholesaleMinQty = wholesaleMinQtyValue;
  }

  let minOrderQuantity: number | null = null;
  if (product.min_order_quantity != null) {
    const parsed = Number(product.min_order_quantity);
    if (!Number.isNaN(parsed) && parsed > 0) {
      minOrderQuantity = parsed;
    }
  }

  let discountPrice: number | null = null;
  if (product.discount_enabled && product.discount_price != null) {
    const parsed = Number(product.discount_price);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      discountPrice = parsed;
    }
  }

  const discountStartsAt = product.discount_schedule_enabled ? product.discount_starts_at ?? null : null;
  const discountEndsAt = product.discount_schedule_enabled ? product.discount_ends_at ?? null : null;

  return {
    id: String(product.id),
    storeId: String(product.store_id ?? store.id),
    storeName: formatStoreName(store.name),
    storeSlug: store.slug ?? (store as any).username ?? undefined,
    name: product.title ?? (product as BackendProduct & { name?: string }).name ?? 'Untitled product',
    description: product.description ?? '',
    price: Number(product.price ?? 0),
    originalPrice: product.original_price != null ? Number(product.original_price) : undefined,
    image: images[0] ?? fallbackImage,
    images,
    category: product.category ?? store.category?.name ?? 'General',
    rating: ratingValue > 0 ? Number(ratingValue.toFixed(1)) : 0,
    totalReviews,
    inStock: Boolean(product.is_active ?? (product as BackendProduct & { status?: boolean }).status),
    unitType: isValidProductUnitType(product.unit_type) ? (product.unit_type as ProductUnitType) : undefined,
    unitCustomLabel: product.unit_custom_label ?? null,
    unitQuantity,
    wholesaleEnabled: Boolean(product.wholesale_enabled),
    wholesalePrice,
    wholesaleMinQty,
    minOrderQuantity,
    discountEnabled: Boolean(product.discount_enabled),
    discountPrice,
    discountScheduleEnabled: Boolean(product.discount_schedule_enabled),
    discountStartsAt,
    discountEndsAt,
  };
};

const normalizeService = (service: BackendService, store: BackendStore): Service => {
  const minQuantityValue = service.min_quantity != null ? Number(service.min_quantity) : null;
  const packagePriceValue = service.package_price != null ? Number(service.package_price) : null;

  let minQuantity: number | null = null;
  if (minQuantityValue != null && !Number.isNaN(minQuantityValue) && minQuantityValue > 0) {
    minQuantity = minQuantityValue;
  }

  let packagePrice: number | null = null;
  if (service.package_price != null && !Number.isNaN(packagePriceValue)) {
    packagePrice = packagePriceValue;
  }

  return {
    id: String(service.id),
    storeId: String(service.store_id ?? store.id),
    storeName: formatStoreName(store.name),
    storeSlug: store.slug ?? (store as any).username ?? undefined,
    title: service.title,
    description: service.description ?? '',
    price: service.price != null ? Number(service.price) : null,
    image: service.image ?? fallbackImage,
    isActive: Boolean(service.is_active),
    billingUnit: isValidServiceBillingUnit(service.billing_unit) ? (service.billing_unit as ServiceBillingUnit) : undefined,
    customBillingUnit: service.custom_billing_unit ?? null,
    minQuantity,
    packagePrice,
  };
};

const normalizeReview = (review: BackendReview): Review => {
  const ratingValue = Math.min(5, Math.max(0, toNumber(review.rating)));
  const sellerReply = review.seller_reply?.message
    ? {
        message: review.seller_reply.message,
        date: review.seller_reply.date ?? review.reviewed_at ?? new Date().toISOString(),
      }
    : undefined;

  return {
    id: String(review.id),
    storeId: review.store_id ? String(review.store_id) : '',
    productId: review.product_id ? String(review.product_id) : undefined,
    userName: review.user_name || review.user?.name || 'Anonymous',
    userAvatar: review.user_avatar || (review.user?.avatar ? String(review.user.avatar) : undefined),
    rating: ratingValue,
    comment: review.comment ?? '',
    reviewedAt: review.reviewed_at ?? new Date().toISOString(),
    sellerReply,
    isApproved: review.is_approved !== false,
  };
};

const normalizeReviewListResponse = (payload: BackendReviewListResponse): ReviewListResponse => ({
  summary: {
    rating: Number(payload.summary?.rating ?? 0),
    totalReviews: Number(payload.summary?.total_reviews ?? 0),
  },
  pagination: {
    currentPage: payload.pagination?.current_page ?? 1,
    lastPage: payload.pagination?.last_page ?? 1,
    perPage: payload.pagination?.per_page ?? (payload.reviews?.length ?? 0),
    total: payload.pagination?.total ?? payload.reviews?.length ?? 0,
    hasMore: Boolean(payload.pagination?.has_more),
  },
  reviews: Array.isArray(payload.reviews) ? payload.reviews.map((review) => normalizeReview(review)) : [],
});

export const loginUser = async (payload: LoginPayload) => {
  const response = await apiRequest<{ token: string; user: ApiUser }>(
    '/auth/login',
    {
      method: 'POST',
      body: payload,
    }
  );

  const normalizedUser = normalizeUser(response.data.user);
  setAuthToken(response.data.token);
  persistAuthUser(normalizedUser);
  return { token: response.data.token, user: normalizedUser };
};

export const registerUser = async (payload: RegisterPayload) => {
  const response = await apiRequest<{ token: string; user: ApiUser }>(
    '/auth/register',
    {
      method: 'POST',
      body: payload,
    }
  );

  const normalizedUser = normalizeUser(response.data.user);
  setAuthToken(response.data.token);
  persistAuthUser(normalizedUser);
  return { token: response.data.token, user: normalizedUser };
};

export const fetchAuthenticatedUser = async (): Promise<ApiUser> => {
  const response = await apiRequest<ApiUser>('/auth/me', {
    requiresAuth: true,
  });

  return normalizeUser(response.data);
};

export const getCategories = async (options?: { auth?: boolean }): Promise<Category[]> => {
  const response = await apiRequest<Category[]>('/categories', {
    requiresAuth: options?.auth ?? false,
  });
  return response.data;
};

export const createCategory = async (payload: CreateCategoryPayload): Promise<Category> => {
  const response = await apiRequest<Category>('/categories', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  return response.data;
};

export const updateCategoryBanner = async (
  categoryId: number | string,
  payload: UpdateCategoryBannerPayload
): Promise<Category> => {
  const response = await apiRequest<Category>(`/categories/${categoryId}/banner`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });

  return response.data;
};

export const deleteCategory = async (categoryId: number | string): Promise<void> => {
  await apiRequest(`/categories/${categoryId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const createStore = async (payload: CreateStorePayload) => {
  const response = await apiRequest<{ store: BackendStore; business_type: string }>("/store", {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  const normalizedStore = normalizeStore(response.data.store);

  const existingUser = getStoredUser();
  if (existingUser) {
    const newStoreSummary: StoreSummary = {
      id: normalizedStore.id,
      name: normalizedStore.name,
      slug: normalizedStore.username,
    };
    const nextStores = [...(existingUser.stores ?? []), newStoreSummary].filter(
      (store, index, self) => self.findIndex((candidate) => candidate.id === store.id) === index
    );

    const updatedUser: ApiUser = {
      ...existingUser,
      storeSlug: newStoreSummary.slug,
      stores: nextStores,
    };
    persistAuthUser(updatedUser);
  }

  return { store: normalizedStore, businessType: response.data.business_type };
};

export const getMyStores = async (): Promise<Store[]> => {
  const response = await apiRequest<BackendStore[]>('/my/stores', {
    method: 'GET',
    requiresAuth: true,
  });

  return response.data.map((store) => normalizeStore(store));
};

export const getStoreBySlug = async (slug: string): Promise<Store> => {
  const response = await apiRequest<BackendStore>(`/store/${slug}`, {
    method: 'GET',
  });

  return normalizeStore(response.data);
};

export const searchAll = async (params: SearchAllParams) => {
  const { query, location, lat, lng, radiusKm, types, limits } = params;
  const queryParams = new URLSearchParams();
  queryParams.append('q', query);
  if (location) queryParams.append('location', location);
  if (typeof lat === 'number') queryParams.append('lat', lat.toString());
  if (typeof lng === 'number') queryParams.append('lng', lng.toString());
  if (typeof radiusKm === 'number') queryParams.append('radius_km', radiusKm.toString());
  if (Array.isArray(types) && types.length) queryParams.append('types', types.join(','));
  if (limits?.stores) queryParams.append('store_limit', limits.stores.toString());
  if (limits?.products) queryParams.append('product_limit', limits.products.toString());
  if (limits?.services) queryParams.append('service_limit', limits.services.toString());

  const response = await apiRequest<BackendSearchResponse>(`/search?${queryParams.toString()}`);
  const payload = response.data;

  const normalizedStores = Array.isArray(payload.results?.stores)
    ? payload.results.stores.map((store) => normalizeStore(store))
    : [];
  const normalizedProducts = Array.isArray(payload.results?.products)
    ? payload.results.products
        .filter((product) => product?.store)
        .map((product) => normalizeProduct(product, product.store as BackendStore))
    : [];
  const normalizedServices = Array.isArray(payload.results?.services)
    ? payload.results.services
        .filter((service) => service?.store)
        .map((service) => normalizeService(service, service.store as BackendStore))
    : [];

  return {
    query: payload.query,
    location: payload.location,
    lat: payload.lat,
    lng: payload.lng,
    radiusKm: payload.radius_km,
    types: Array.isArray(payload.types) && payload.types.length
      ? (payload.types as Array<'stores' | 'products' | 'services'>)
      : (['stores', 'products', 'services'] as Array<'stores' | 'products' | 'services'>),
    stores: normalizedStores,
    products: normalizedProducts,
    services: normalizedServices,
  } as const;
};

export const updateStore = async (payload: UpdateStorePayload) => {
  console.log('Updating store with payload:', payload);
  
  const response = await apiRequest<BackendStore>(`/store/${payload.id}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });

  console.log('Update store API response:', response.data);
  const normalizedStore = normalizeStore(response.data);
  console.log('Normalized store:', normalizedStore);
  
  return { store: normalizedStore };
};

export const deleteStore = async (storeId: number | string) => {
  await apiRequest(`/store/${storeId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const addProduct = async (payload: AddProductPayload) => {
  const response = await apiRequest<BackendProduct>('/product', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  // We don't have the store context in this response, so return minimal data.
  return {
    product: normalizeProduct(response.data, {
      id: Number(response.data.store_id ?? 0),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'product' },
      is_active: true,
      is_verified: false,
    } as BackendStore),
  };
};

export const getAllStores = async (params?: {
  search?: string;
  category?: string;
  location?: string;
  only_verified?: boolean;
  only_boosted?: boolean;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  include_inactive?: boolean;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.location) queryParams.append('location', params.location);
  if (params?.only_verified) queryParams.append('only_verified', '1');
  if (params?.only_boosted) queryParams.append('only_boosted', '1');
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (typeof params?.lat === 'number') queryParams.append('lat', params.lat.toString());
  if (typeof params?.lng === 'number') queryParams.append('lng', params.lng.toString());
  if (typeof params?.radiusKm === 'number') queryParams.append('radius_km', params.radiusKm.toString());
  if (params?.include_inactive) queryParams.append('include_inactive', '1');

  const url = `/stores${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiRequest<BackendStore[]>(url);

  const normalizedStores = response.data.map((store) => normalizeStore(store));
  return normalizedStores;
};

export const getBoostPlans = async (): Promise<BoostPlan[]> => {
  const response = await apiRequest<BackendBoostPlan[]>('/boost-plans', {
    requiresAuth: true,
  });

  return response.data.map((plan) => normalizeBoostPlan(plan));
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  const response = await apiRequest<AdminDashboardStats>('/admin/dashboard', {
    requiresAuth: true,
  });

  return response.data;
};

export const getAllBoostPlans = async (): Promise<BoostPlan[]> => {
  const response = await apiRequest<BackendBoostPlan[]>('/boost-plans/all', {
    requiresAuth: true,
  });

  return response.data.map((plan) => normalizeBoostPlan(plan));
};

export const createBoostPlan = async (payload: Partial<BackendBoostPlan>) => {
  const response = await apiRequest<BackendBoostPlan>('/boost-plans', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  return normalizeBoostPlan(response.data);
};

export const updateBoostPlan = async (planId: number | string, payload: Partial<BackendBoostPlan>) => {
  const response = await apiRequest<BackendBoostPlan>(`/boost-plans/${planId}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });

  return normalizeBoostPlan(response.data);
};

export const deleteBoostPlan = async (planId: number | string) => {
  await apiRequest(`/boost-plans/${planId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const activateStoreBoost = async (
  storeId: number | string,
  payload: { planId: number | string; startsAt?: string }
): Promise<StoreBoost> => {
  const response = await apiRequest<BackendStoreBoost>(`/stores/${storeId}/boosts`, {
    method: 'POST',
    body: {
      plan_id: payload.planId,
      ...(payload.startsAt ? { starts_at: payload.startsAt } : {}),
    },
    requiresAuth: true,
  });

  return normalizeStoreBoost(response.data);
};

export const getStoreBoostOverview = async (storeId: number | string) => {
  const response = await apiRequest<{ store: BackendStore; activeBoost: BackendStoreBoost | null }>(
    `/stores/${storeId}/boosts`,
    {
      requiresAuth: true,
    }
  );

  return {
    store: normalizeStore(response.data.store),
    activeBoost: response.data.activeBoost ? normalizeStoreBoost(response.data.activeBoost) : null,
  };
};

export const getStoreBoosts = async (): Promise<StoreBoost[]> => {
  const response = await apiRequest<BackendStoreBoost[]>('/boosts', {
    requiresAuth: true,
  });

  return response.data.map((boost) => normalizeStoreBoost(boost, { includeStore: true }));
};

export const cancelBoost = async (boostId: number | string): Promise<StoreBoost> => {
  const response = await apiRequest<BackendStoreBoost>(`/boosts/${boostId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

  return normalizeStoreBoost(response.data);
};

export const getProductsByStore = async (storeId: number | string) => {
  const response = await apiRequest<BackendProduct[]>(`/products/${storeId}`);
  return response.data.map((product) =>
    normalizeProduct(product, {
      id: Number(storeId),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'product' },
      is_active: true,
      is_verified: false,
    } as BackendStore)
  );
};

export const getServicesByStore = async (storeId: number | string) => {
  const response = await apiRequest<BackendService[]>(`/services/${storeId}`);
  return response.data.map((service) =>
    normalizeService(service, {
      id: Number(storeId),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'service' },
      is_active: true,
      is_verified: false,
    } as BackendStore)
  );
};

export const getServiceById = async (serviceId: number | string) => {
  const response = await apiRequest<BackendService & { store?: BackendStore }>(`/service/${serviceId}`);

  if (!response.data) {
    throw new ApiError('Service not found', 404);
  }

  const service = response.data;
  const store = service.store || {
    id: Number(service.store_id ?? 0),
    user_id: 0,
    name: '',
    slug: '',
    category: { id: 0, name: 'General', business_type: 'service' },
    is_active: true,
    is_verified: false,
  } as BackendStore;

  return {
    service: normalizeService(service, store),
    store: service.store ? normalizeStore(service.store) : null,
  };
};

export const getProductById = async (productId: number | string) => {
  const response = await apiRequest<BackendProduct & { store?: BackendStore }>(`/product/${productId}`);
  
  if (!response.data) {
    throw new ApiError('Product not found', 404);
  }

  const product = response.data;
  const store = product.store || {
    id: Number(product.store_id ?? 0),
    user_id: 0,
    name: '',
    slug: '',
    category: { id: 0, name: 'General', business_type: 'product' },
    is_active: true,
    is_verified: false,
  } as BackendStore;

  return {
    product: normalizeProduct(product, store),
    store: product.store ? normalizeStore(product.store) : null,
  };
};

const buildQuery = (params?: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  if (!params) return '';
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.append(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export const getProductReviews = async (
  productId: number | string,
  params?: ReviewListParams
): Promise<ReviewListResponse> => {
  const query = buildQuery({ page: params?.page, per_page: params?.perPage });
  const response = await apiRequest<BackendReviewListResponse>(`/product/${productId}/reviews${query}`);
  return normalizeReviewListResponse(response.data);
};

export const getStoreReviews = async (
  storeId: number | string,
  params?: ReviewListParams
): Promise<ReviewListResponse> => {
  const query = buildQuery({ page: params?.page, per_page: params?.perPage });
  const response = await apiRequest<BackendReviewListResponse>(`/store/${storeId}/reviews${query}`);
  return normalizeReviewListResponse(response.data);
};

export const submitProductReview = async (
  productId: number | string,
  payload: ReviewSubmitPayload
): Promise<{ review: Review; summary: ReviewListResponse['summary'] }> => {
  const response = await apiRequest<{ review: BackendReview; summary: { [key: string]: number } }>(
    `/product/${productId}/reviews`,
    {
      method: 'POST',
      body: {
        rating: payload.rating,
        comment: payload.comment,
      },
      requiresAuth: true,
    }
  );

  return {
    review: normalizeReview(response.data.review),
    summary: {
      rating: Number(response.data.summary?.product_rating ?? 0),
      totalReviews: Number(response.data.summary?.product_reviews ?? 0),
    },
  };
};

export const submitStoreReview = async (
  storeId: number | string,
  payload: ReviewSubmitPayload
): Promise<{ review: Review; summary: ReviewListResponse['summary'] }> => {
  const response = await apiRequest<{ review: BackendReview; summary: { [key: string]: number } }>(
    `/store/${storeId}/reviews`,
    {
      method: 'POST',
      body: {
        rating: payload.rating,
        comment: payload.comment,
      },
      requiresAuth: true,
    }
  );

  return {
    review: normalizeReview(response.data.review),
    summary: {
      rating: Number(response.data.summary?.store_rating ?? 0),
      totalReviews: Number(response.data.summary?.store_reviews ?? 0),
    },
  };
};

export const handleApiError = (error: unknown) => {
  if (isApiError(error)) {
    throw error;
  }
  throw new ApiError(error instanceof Error ? error.message : 'Unexpected error');
};

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await apiRequest<any[]>('/subscription-plans', {
    requiresAuth: true,
  });

  return response.data.map((plan) => ({
    id: String(plan.id),
    name: plan.name,
    slug: plan.slug,
    price: Number(plan.price),
    billingCycle: plan.billing_cycle,
    durationDays: plan.duration_days ? Number(plan.duration_days) : undefined,
    maxProducts: Number(plan.max_products),
    isPopular: Boolean(plan.is_popular),
    isActive: Boolean(plan.is_active),
    features: Array.isArray(plan.features) ? plan.features : [],
    description: plan.description || '',
  }));
};

export const getAllSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await apiRequest<any[]>('/subscription-plans/all', {
    requiresAuth: true,
  });

  return response.data.map((plan) => ({
    id: String(plan.id),
    name: plan.name,
    slug: plan.slug,
    price: Number(plan.price),
    billingCycle: plan.billing_cycle,
    durationDays: plan.duration_days ? Number(plan.duration_days) : undefined,
    maxProducts: Number(plan.max_products),
    isPopular: Boolean(plan.is_popular),
    isActive: Boolean(plan.is_active),
    features: Array.isArray(plan.features) ? plan.features : [],
    description: plan.description || '',
  }));
};

export const createSubscriptionPlan = async (payload: Partial<any>) => {
  const response = await apiRequest<any>('/subscription-plans', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  return {
    id: String(response.data.id),
    name: response.data.name,
    slug: response.data.slug,
    price: Number(response.data.price),
    billingCycle: response.data.billing_cycle,
    durationDays: response.data.duration_days ? Number(response.data.duration_days) : undefined,
    maxProducts: Number(response.data.max_products),
    isPopular: Boolean(response.data.is_popular),
    isActive: Boolean(response.data.is_active),
    features: Array.isArray(response.data.features) ? response.data.features : [],
    description: response.data.description || '',
  };
};

export const updateSubscriptionPlan = async (planId: number | string, payload: Partial<any>) => {
  const response = await apiRequest<any>(`/subscription-plans/${planId}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });

  return {
    id: String(response.data.id),
    name: response.data.name,
    slug: response.data.slug,
    price: Number(response.data.price),
    billingCycle: response.data.billing_cycle,
    durationDays: response.data.duration_days ? Number(response.data.duration_days) : undefined,
    maxProducts: Number(response.data.max_products),
    isPopular: Boolean(response.data.is_popular),
    isActive: Boolean(response.data.is_active),
    features: Array.isArray(response.data.features) ? response.data.features : [],
    description: response.data.description || '',
  };
};

export const deleteSubscriptionPlan = async (planId: number | string) => {
  await apiRequest(`/subscription-plans/${planId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const getStoreSubscription = async (storeId: number | string) => {
  const response = await apiRequest<{ activeSubscription: any | null }>(`/stores/${storeId}/subscription`, {
    requiresAuth: true,
  });

  if (!response.data.activeSubscription) {
    return { activeSubscription: null };
  }

  const sub = response.data.activeSubscription;
  return {
    activeSubscription: {
      id: String(sub.id),
      storeId: String(sub.store_id),
      subscriptionPlanId: String(sub.subscription_plan_id),
      price: Number(sub.price),
      status: sub.status,
      startsAt: sub.starts_at,
      endsAt: sub.ends_at,
      autoRenew: Boolean(sub.auto_renew),
      activatedBy: sub.activated_by ? String(sub.activated_by) : undefined,
      plan: {
        id: String(sub.plan.id),
        name: sub.plan.name,
        slug: sub.plan.slug,
        price: Number(sub.plan.price),
        billingCycle: sub.plan.billing_cycle,
        durationDays: sub.plan.duration_days ? Number(sub.plan.duration_days) : undefined,
        maxProducts: Number(sub.plan.max_products),
        isPopular: Boolean(sub.plan.is_popular),
        isActive: Boolean(sub.plan.is_active),
        features: Array.isArray(sub.plan.features) ? sub.plan.features : [],
        description: sub.plan.description || '',
      },
    },
  };
};

export const activateStoreSubscription = async (
  storeId: number | string,
  payload: { planId: number | string; startsAt?: string }
): Promise<StoreSubscription> => {
  const response = await apiRequest<any>(`/stores/${storeId}/subscription`, {
    method: 'POST',
    body: {
      plan_id: payload.planId,
      ...(payload.startsAt ? { starts_at: payload.startsAt } : {}),
    },
    requiresAuth: true,
  });

  const sub = response.data;
  return {
    id: String(sub.id),
    storeId: String(sub.store_id),
    subscriptionPlanId: String(sub.subscription_plan_id),
    price: Number(sub.price),
    status: sub.status,
    startsAt: sub.starts_at,
    endsAt: sub.ends_at,
    autoRenew: Boolean(sub.auto_renew),
    activatedBy: sub.activated_by ? String(sub.activated_by) : undefined,
    plan: {
      id: String(sub.plan.id),
      name: sub.plan.name,
      slug: sub.plan.slug,
      price: Number(sub.plan.price),
      billingCycle: sub.plan.billing_cycle,
      maxProducts: Number(sub.plan.max_products),
      isPopular: Boolean(sub.plan.is_popular),
      isActive: Boolean(sub.plan.is_active),
      features: Array.isArray(sub.plan.features) ? sub.plan.features : [],
      description: sub.plan.description || '',
    },
  };
};

export const cancelStoreSubscription = async (subscriptionId: number | string): Promise<StoreSubscription> => {
  const response = await apiRequest<any>(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

  const sub = response.data;
  return {
    id: String(sub.id),
    storeId: String(sub.store_id),
    subscriptionPlanId: String(sub.subscription_plan_id),
    price: Number(sub.price),
    status: sub.status,
    startsAt: sub.starts_at,
    endsAt: sub.ends_at,
    autoRenew: Boolean(sub.auto_renew),
    activatedBy: sub.activated_by ? String(sub.activated_by) : undefined,
    plan: {
      id: String(sub.plan.id),
      name: sub.plan.name,
      slug: sub.plan.slug,
      price: Number(sub.plan.price),
      billingCycle: sub.plan.billing_cycle,
      maxProducts: Number(sub.plan.max_products),
      isPopular: Boolean(sub.plan.is_popular),
      isActive: Boolean(sub.plan.is_active),
      features: Array.isArray(sub.plan.features) ? sub.plan.features : [],
      description: sub.plan.description || '',
    },
  };
};

// ============================================
