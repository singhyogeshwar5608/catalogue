/** Add-ons chosen at subscription checkout (persisted on the store). */
export interface StoreSubscriptionAddons {
  paymentGateway: boolean;
  qrCode: boolean;
  paymentGatewayHelp: boolean;
}

/** Owner-only payment hub payload from `GET/POST …/payment-integration`. */
export interface StorePaymentIntegrationSettings {
  subscriptionAddons: StoreSubscriptionAddons;
  razorpayKeyId: string | null;
  hasRazorpaySecret: boolean;
  paymentQrUrl: string | null;
  helpWhatsappE164: string;
  helpWhatsappUrl: string;
}

export type BoostStatus = 'active' | 'expired' | 'cancelled';

export interface BoostPlan {
  id: string;
  name: string;
  days: number;
  price: number;
  priorityWeight: number;
  badgeLabel: string;
  badgeColor: string;
  isActive: boolean;
  features?: string[];
}

export interface StoreBoost {
  id: string;
  storeId: string;
  startsAt: string;
  endsAt: string;
  status: BoostStatus;
  activatedBy?: string;
  plan: BoostPlan;
  store?: Store;
}

export interface Store {
  id: string;
  userId?: string;
  username: string;
  name: string;
  logo: string;
  banner: string;
  storeBannerImage?: string | null;
  categoryBannerImage?: string | null;
  categoryBannerColor?: string | null;
  description: string;
  shortDescription: string;
  rating: number;
  totalReviews: number;
  isVerified: boolean;
  isBoosted: boolean;
  isActive?: boolean;
  boostExpiryDate?: string;
  businessType: string;
  categoryName?: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  phone?: string;
  /** Business / contact email stored on the store record */
  email?: string;
  showPhone?: boolean;
  whatsapp: string;
  gstVerified?: boolean;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  membershipYears?: number | null;
  trustSeal?: boolean;
  socialLinks?: {
    facebook?: string | null;
    instagram?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
  };
  layoutType: 'layout1' | 'layout2';
  categoryId?: string;
  themeId?: string;
  createdAt: string;
  /** ISO datetime when the free store trial ends (from Laravel `trial_ends_at` or derived from `createdAt` + platform `free_trial_days`). */
  trialEndsAt?: string | null;
  activeBoost?: StoreBoost | null;
  activeSubscription?: StoreSubscription | null;
  /** Enabled subscription add-ons (payment hub, QR, company gateway help). */
  subscriptionAddons?: StoreSubscriptionAddons;
  productsCount?: number;
  servicesCount?: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  category?: {
    id: number;
    name: string;
    slug?: string;
    business_type: 'product' | 'service' | 'hybrid';
    banner_image?: string | null;
    banner_images?: string[] | null;
    banner_title?: string | null;
    banner_subtitle?: string | null;
    banner_color?: string | null;
    color_combinations?: { color1: string; color2: string }[] | null;
    banner_pattern?: 'waves' | 'diagonal' | 'circles' | null;
  };
  products?: Product[];
  services?: Service[];
}

export type ProductUnitType =
  | 'piece'
  | 'box'
  | 'pack'
  | 'set'
  | 'kilogram'
  | 'gram'
  | 'liter'
  | 'milliliter'
  | 'meter'
  | 'centimeter'
  | 'square_meter'
  | 'custom';

export interface Product {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  category: string;
  rating: number;
  totalReviews: number;
  inStock: boolean;
  unitType?: ProductUnitType;
  unitCustomLabel?: string | null;
  unitQuantity?: number | null;
  wholesaleEnabled?: boolean;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  minOrderQuantity?: number | null;
  discountEnabled?: boolean;
  discountPrice?: number | null;
  discountScheduleEnabled?: boolean;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
}

export type ServiceBillingUnit =
  | 'session'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'project'
  | 'custom';

export interface Service {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug?: string;
  title: string;
  description: string;
  price: number | null;
  image: string;
  isActive: boolean;
  billingUnit?: ServiceBillingUnit;
  customBillingUnit?: string | null;
  minQuantity?: number | null;
  packagePrice?: number | null;
}

export interface UnifiedSearchResult {
  query: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  stores: Store[];
  products: Product[];
  services: Service[];
  types: Array<'stores' | 'products' | 'services'>;
}

export interface Review {
  id: string;
  storeId: string;
  productId?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  reviewedAt: string;
  sellerReply?: {
    message: string;
    date: string;
  };
  isApproved: boolean;
}

export type RatingSummary = {
  rating: number;
  totalReviews: number;
};

export type ReviewPagination = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  hasMore: boolean;
};

export type ReviewListResponse = {
  summary: RatingSummary;
  pagination: ReviewPagination;
  reviews: Review[];
};

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  storeId?: string;
  isAdmin: boolean;
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    expiryDate: string;
    isActive: boolean;
  };
  referralCode: string;
  totalReferrals: number;
  referralDaysEarned: number;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  durationDays?: number;
  features: string[];
  maxProducts: number;
  isPopular?: boolean;
  isActive?: boolean;
  description?: string;
}

/** Global add-on amounts (₹) charged when a merchant opts for gateway setup, QR, or assisted integration. */
export interface SubscriptionAddonCharges {
  payment_gateway_integration_inr: number;
  qr_code_inr: number;
  payment_gateway_help_inr: number;
}

export interface StoreSubscription {
  id: string;
  storeId: string;
  subscriptionPlanId: string;
  price: number;
  status: 'active' | 'expired' | 'cancelled';
  startsAt: string;
  endsAt: string;
  autoRenew: boolean;
  activatedBy?: string;
  plan: SubscriptionPlan;
  store?: Store;
}

export interface AdminDashboardStats {
  totals: {
    totalStores: number;
    activeStores: number;
    verifiedStores: number;
    boostedStores: number;
    totalBoosts: number;
    activeBoosts: number;
    monthlyNewStores: number;
    monthlyBoostRevenue: number;
  };
  recentStores: Array<{
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    category: string | null;
    is_verified: boolean;
    is_active: boolean;
    is_boosted: boolean;
    created_at: string;
  }>;
  recentBoosts: Array<{
    id: number;
    store_name: string | null;
    store_slug: string | null;
    plan_name: string | null;
    price: number;
    status: string;
    ends_at: string;
  }>;
  atRiskStores: Array<{
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    is_verified: boolean;
    boost_expiry_date: string | null;
  }>;
  planDistribution: Array<{
    id: number;
    name: string;
    price: number;
    total_boosts: number;
    active_boosts: number;
  }>;
}
