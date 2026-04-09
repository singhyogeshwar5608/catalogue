import type { Store, Product } from '@/types';
import { formatStoreName } from '@/src/lib/format';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1/v1';

export type ApiEnvelope<T> = {
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

export type BackendStore = {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  category: string;
  logo?: string | null;
  banner?: string | null;
  phone?: string | null;
  show_phone?: boolean | null;
  whatsapp?: string | null;
  address?: string | null;
  location?: string | null;
  description?: string | null;
  short_description?: string | null;
  rating?: string | number | null;
  total_reviews?: string | number | null;
  business_type?: string | null;
  layout_type?: 'layout1' | 'layout2' | null;
  boost_expiry_date?: string | null;
  is_verified: boolean;
  is_boosted?: boolean | null;
  is_active: boolean;
  created_at?: string | null;
  products?: BackendProduct[];
};

export type BackendProduct = {
  id: number;
  store_id: number;
  title: string;
  price: string | number;
  image?: string | null;
  images?: string[] | null;
  description?: string | null;
  category?: string | null;
  rating?: string | number | null;
  total_reviews?: string | number | null;
  is_active: boolean;
};

const fallbackLogo = 'https://images.unsplash.com/photo-1503602642458-232111445657?w=200&h=200&fit=crop';
const fallbackBanner = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&h=400&fit=crop';
const fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop';

const toNumber = (value?: string | number | null) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const normalizeStore = (store: BackendStore): Store => {
  const description = store.description ?? '';
  const businessType = store.business_type ?? store.category;
  const shortDescription = store.short_description ?? (description.slice(0, 120) || businessType);
  const ratingValue = toNumber(store.rating);
  const totalReviews = toNumber(store.total_reviews);
  const location = store.location ?? store.address ?? 'Pan India';
  const whatsapp = store.whatsapp ?? store.phone ?? '+91 90000 00000';
  const banner = store.banner ?? fallbackBanner;
  const layoutType = store.layout_type === 'layout2' ? 'layout2' : 'layout1';

  return {
    id: String(store.id),
    username: store.slug,
    name: formatStoreName(store.name),
    logo: store.logo ?? fallbackLogo,
    banner,
    description,
    shortDescription,
    rating: ratingValue || 4.8,
    totalReviews,
    isVerified: Boolean(store.is_verified),
    isBoosted: Boolean(store.is_boosted),
    boostExpiryDate: store.boost_expiry_date ?? undefined,
    businessType,
    location,
    showPhone: store.show_phone !== false,
    whatsapp,
    layoutType,
    createdAt: store.created_at ?? new Date().toISOString(),
  };
};

export const normalizeProduct = (product: BackendProduct, store: BackendStore): Product => ({
  id: String(product.id),
  storeId: String(product.store_id ?? store.id),
  storeName: formatStoreName(store.name),
  name: product.title,
  description: product.description ?? '',
  price: Number(product.price ?? 0),
  originalPrice: undefined,
  image: product.image ?? fallbackImage,
  images: product.images && product.images.length ? product.images : [product.image ?? fallbackImage],
  category: product.category ?? store.category,
  rating: toNumber(product.rating) || 4.7,
  totalReviews: toNumber(product.total_reviews),
  inStock: Boolean(product.is_active),
});

export { fallbackImage, fallbackLogo, fallbackBanner };
