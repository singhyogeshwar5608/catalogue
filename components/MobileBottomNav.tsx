'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Store,
  Grid3x3,
  PlusCircle,
  LayoutDashboard,
  Package,
  CreditCard,
  Rocket,
  Megaphone,
  Users,
  QrCode,
  Settings,
  LogOut,
  ChevronRight,
  CircleHelp,
  Plug2,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { getStoreBySlugFromApi } from '@/src/lib/api';
import { STORE_PROFILE_REFRESH_EVENT, storeCanAccessPaymentIntegrationHub } from '@/src/lib/storeSubscriptionAddons';

type NavItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  href?: string;
  isActive?: boolean;
  action?: () => void;
  accent?: string;
};

type DrawerItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
};

const DEFAULT_ACCENT = '#0f172a';

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const NavButton = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  const accent = item.accent ?? DEFAULT_ACCENT;
  const circleStyle: CSSProperties = item.isActive
    ? { background: accent, borderColor: accent }
    : { background: withAlpha(accent, 0.18), borderColor: withAlpha(accent, 0.3) };
  const iconColor = item.isActive ? '#fff' : accent;
  const labelColor = item.isActive ? accent : withAlpha(accent, 0.8);
  const baseClassName = `group relative flex h-full flex-1 flex-col items-center justify-center rounded-2xl px-2 text-current transition-all duration-300 ease-out active:scale-[0.97]`;
  const innerContent = (
    <>
      <span
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300"
        style={circleStyle}
      >
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
      </span>
      <span
        className="relative text-[10.5px] font-semibold leading-tight tracking-[0.02em] text-center transition duration-300 whitespace-nowrap"
        style={{ color: labelColor }}
      >
        {item.label}
      </span>
    </>
  );

  if (item.action) {
    return (
      <button
        type="button"
        onClick={item.action}
        className={baseClassName}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <Link
      href={item.href ?? '#'}
      className={baseClassName}
    >
      {innerContent}
    </Link>
  );
};

const LoggedOutBottomNav = ({ items }: { items: NavItem[] }) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-0 pb-[env(safe-area-inset-bottom)] pt-0">
    <div className="relative flex h-[68px] w-full items-center justify-around rounded-t-3xl border border-slate-200 bg-[linear-gradient(145deg,#e2e8f0_0%,#f8fafc_70%,#ffffff_100%)] px-2 shadow-[0_-8px_18px_rgba(15,23,42,0.15)]">
      {items.map((item) => (
        <NavButton key={item.key} item={item} />
      ))}
    </div>
  </nav>
);

const LoggedInBottomNav = ({ items }: { items: NavItem[] }) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-0 pb-[env(safe-area-inset-bottom)] pt-0">
    <div className="relative flex h-[68px] w-full items-center justify-around rounded-t-3xl border border-slate-200 bg-[linear-gradient(145deg,#e2e8f0_0%,#f8fafc_70%,#ffffff_100%)] px-2 shadow-[0_-8px_18px_rgba(15,23,42,0.15)]">
      {items.map((item) => (
        <NavButton key={item.key} item={item} />
      ))}
    </div>
  </nav>
);

const Drawer = ({
  isOpen,
  onClose,
  storeSlug,
  items,
  userName,
  isLoggedIn,
}: {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string | null;
  items: DrawerItem[];
  userName: string;
  isLoggedIn: boolean;
}) => (
  <div className={`md:hidden fixed inset-0 z-30 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
    <div className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
    <div
      className={`absolute inset-x-0 bottom-[76px] max-h-[calc(80vh-76px)] border-t border-slate-200 bg-white text-slate-900 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300" />
      <div className="overflow-y-auto px-0 py-3" style={{ maxHeight: 'calc(80vh - 2rem)' }}>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f59e0b,#f97316)] text-sm font-bold text-white">
              {userName.trim().charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-semibold text-slate-900">{userName}</p>
              <p className="text-sm text-slate-500">{isLoggedIn ? 'Online' : 'Guest'}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200" />
        <div className="px-3 py-2">
          {storeSlug && isLoggedIn && (
            <Link
              href={`/store/${storeSlug}`}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-[17px] font-medium text-slate-800 transition hover:bg-slate-50"
              onClick={onClose}
            >
              <Store className="h-5 w-5 text-slate-500" />
              <span className="flex-1">View My Store</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          )}
          {items.map((item, index) => {
            const Icon = item.icon;
            const isLogout = item.label.toLowerCase() === 'logout';
            const isSettings = item.label.toLowerCase() === 'settings';
            const showTopDivider = index === items.length - 1;
            const rowClassName = `flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[17px] font-medium transition ${
              isLogout ? 'text-red-600 hover:bg-red-50' : 'text-slate-800 hover:bg-slate-50'
            }`;
            const iconClassName = isLogout ? 'h-5 w-5 text-red-500' : 'h-5 w-5 text-slate-500';

            const content = item.action ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  item.action?.();
                }}
                className={rowClassName}
              >
                <Icon className={iconClassName} />
                <span className="flex-1">{item.label}</span>
                {!isLogout && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
            ) : (
              <Link
                href={item.href as string}
                className={rowClassName}
                onClick={onClose}
              >
                <Icon className={iconClassName} />
                <span className="flex-1">{item.label}</span>
                {isSettings ? <CircleHelp className="h-4 w-4 text-slate-400 opacity-0" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </Link>
            );

            return (
              <div key={item.label}>
                {showTopDivider && <div className="my-2 border-t border-slate-200" />}
                {content}
                {!isLogout && index !== items.length - 1 && <div className="mx-3 border-b border-slate-200" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

const QrModal = ({ isOpen, onClose, storeShareUrl }: { isOpen: boolean; onClose: () => void; storeShareUrl: string | null }) => (
  <div className={`md:hidden fixed inset-0 z-30 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
    <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
    <div
      className={`absolute inset-x-4 bottom-[76px] rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300 ease-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Share store</p>
          <h3 className="text-lg font-semibold text-slate-900">QR Code</h3>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-slate-500">
          Close
        </button>
      </div>
      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 shadow-inner">
          {storeShareUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(storeShareUrl)}`}
              alt="Store QR code"
              className="h-44 w-44"
            />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center text-center text-sm text-slate-500">
              Add your store to generate QR
            </div>
          )}
        </div>
        {storeShareUrl && (
          <button
            type="button"
            onClick={() => navigator.share?.({ title: 'My Store', url: storeShareUrl })}
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            Share Link
          </button>
        )}
      </div>
    </div>
  </div>
);

const Toast = ({ message }: { message: string }) => (
  <div className="md:hidden fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
    {message}
  </div>
);

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn: authLoggedIn, user, logout } = useAuth();
  const [legacyAuth, setLegacyAuth] = useState<{ storeSlug: string | null; isAuthenticated: boolean }>({
    storeSlug: null,
    isAuthenticated: false,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [appOrigin, setAppOrigin] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [storeBusinessType, setStoreBusinessType] = useState<'product' | 'service' | 'hybrid' | null>(null);
  const [paymentsHubEligible, setPaymentsHubEligible] = useState(false);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeQrModal = useCallback(() => setQrModalOpen(false), []);

  const showToast = useCallback((message: string) => {
    if (toastRef.current) {
      clearTimeout(toastRef.current);
    }
    setToast(message);
    toastRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastRef.current) {
        clearTimeout(toastRef.current);
      }
    };
  }, []);

  const syncAuthState = useCallback(() => {
    try {
      const pending = localStorage.getItem('pendingRegistration');
      if (pending) {
        const parsed = JSON.parse(pending);
        const slug = parsed?.userData?.storeSlug || parsed?.userData?.username || null;
        setLegacyAuth({ storeSlug: slug, isAuthenticated: Boolean(parsed?.isAuthenticated) });
      } else {
        setLegacyAuth({ storeSlug: null, isAuthenticated: false });
      }
    } catch (error) {
      setLegacyAuth({ storeSlug: null, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    syncAuthState();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncAuthState();
      }
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener('pendingRegistrationChanged', syncAuthState);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('pendingRegistrationChanged', syncAuthState);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncAuthState]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen || qrModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen, qrModalOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
    }
  }, []);

  const derivedStoreSlug = user?.storeSlug ?? legacyAuth.storeSlug;
  const isLoggedIn = authLoggedIn || legacyAuth.isAuthenticated;
  const storeShareUrl = derivedStoreSlug ? `${appOrigin}/store/${derivedStoreSlug}` : null;
  const ownerStoreView = useMemo(() => {
    if (!derivedStoreSlug || !pathname) return false;
    return pathname.startsWith(`/store/${derivedStoreSlug}`);
  }, [pathname, derivedStoreSlug]);
  const isStorePage = pathname?.startsWith('/store/');
  const onAllStoresPage = pathname?.startsWith('/all-stores');
  const onHomePage = pathname === '/';
  const onDashboardPage = pathname?.startsWith('/dashboard');

  useEffect(() => {
    let isMounted = true;
    if (!derivedStoreSlug) {
      setStoreBusinessType(null);
      return undefined;
    }

    (async () => {
      try {
        const store = await getStoreBySlugFromApi(derivedStoreSlug);
        if (!isMounted) return;
        const type = store?.businessType;
        if (type === 'product' || type === 'service' || type === 'hybrid') {
          setStoreBusinessType(type);
        } else {
          setStoreBusinessType(null);
        }
        setPaymentsHubEligible(storeCanAccessPaymentIntegrationHub(store));
      } catch (error) {
        if (!isMounted) return;
        setStoreBusinessType(null);
        setPaymentsHubEligible(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [derivedStoreSlug, pathname]);

  useEffect(() => {
    if (!derivedStoreSlug) return undefined;
    let isMounted = true;
    const onRefresh = () => {
      void (async () => {
        try {
          const store = await getStoreBySlugFromApi(derivedStoreSlug);
          if (!isMounted) return;
          const type = store?.businessType;
          if (type === 'product' || type === 'service' || type === 'hybrid') {
            setStoreBusinessType(type);
          } else {
            setStoreBusinessType(null);
          }
          setPaymentsHubEligible(storeCanAccessPaymentIntegrationHub(store));
        } catch {
          if (!isMounted) return;
          setStoreBusinessType(null);
          setPaymentsHubEligible(false);
        }
      })();
    };
    window.addEventListener(STORE_PROFILE_REFRESH_EVENT, onRefresh);
    return () => {
      isMounted = false;
      window.removeEventListener(STORE_PROFILE_REFRESH_EVENT, onRefresh);
    };
  }, [derivedStoreSlug]);

  const isServiceOnlyStore = storeBusinessType === 'service';
  const addCtaLabel = isServiceOnlyStore ? 'Add Service' : 'Add Product';
  const addCtaHref = isServiceOnlyStore ? '/dashboard/services' : '/dashboard/products';
  const onPrimaryAddPage = pathname?.startsWith(addCtaHref) ?? false;

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // fallback below
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch (error) {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }, []);

  const handleShareStore = useCallback(async () => {
    if (!storeShareUrl) {
      showToast('Set up your store to share');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check my store', url: storeShareUrl });
        showToast('Store link shared');
        return;
      } catch (error) {
        // fallback to copy
      }
    }

    const copied = await copyToClipboard(storeShareUrl);
    showToast(copied ? 'Store link copied' : 'Unable to copy link');
  }, [copyToClipboard, showToast, storeShareUrl]);

  const handleLogout = useCallback(() => {
    try {
      const pending = localStorage.getItem('pendingRegistration');
      if (pending) {
        const parsed = JSON.parse(pending);
        const updated = { ...parsed, isAuthenticated: false };
        localStorage.setItem('pendingRegistration', JSON.stringify(updated));
      } else {
        localStorage.removeItem('pendingRegistration');
      }
    } catch (error) {
      localStorage.removeItem('pendingRegistration');
    }
    setLegacyAuth({ storeSlug: null, isAuthenticated: false });
    logout();
    window.dispatchEvent(new Event('pendingRegistrationChanged'));
    closeDrawer();
    showToast('Logged out');
    router.push('/');
  }, [closeDrawer, logout, router, showToast]);

  const handleCreateStore = useCallback(() => {
    if (isLoggedIn) {
      router.push('/create-store');
    } else {
      router.push('/auth');
    }
  }, [isLoggedIn, router]);

  const loggedOutNavItems = useMemo<NavItem[]>(() => {
    const allStoresItem = { key: 'all-stores', href: '/all-stores', icon: Store, label: 'All Stores', isActive: pathname?.startsWith('/all-stores') };

    if (ownerStoreView) {
      return [
        { key: 'home', href: '/', icon: Home, label: 'Home', isActive: pathname === '/', accent: '#22c55e' },
        allStoresItem,
        {
          key: 'add-primary',
          href: isLoggedIn ? addCtaHref : '/auth',
          icon: PlusCircle,
          label: addCtaLabel,
          accent: '#f97316',
        },
      ];
    }

    const items: NavItem[] = [
      { key: 'home', href: '/', icon: Home, label: 'Home', isActive: pathname === '/', accent: '#22c55e' },
      allStoresItem,
    ];

    if (!onDashboardPage) {
      items.push({ key: 'products', href: '/products', icon: Grid3x3, label: 'Products', isActive: pathname?.startsWith('/products'), accent: '#6366f1' });
    }

    items.push({ key: 'create', icon: PlusCircle, label: 'Create Store', action: handleCreateStore, accent: '#ec4899' });

    return items;
  }, [handleCreateStore, isLoggedIn, onDashboardPage, ownerStoreView, pathname]);

  const loggedInNavItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { key: 'home', href: '/', icon: Home, label: 'Home', isActive: pathname === '/', accent: '#22c55e' },
      { key: 'all-stores', href: '/all-stores', icon: Store, label: 'All Stores', isActive: pathname?.startsWith('/all-stores'), accent: '#0ea5e9' },
    ];

    if (!isStorePage && !onDashboardPage) {
      items.push({ key: 'products', href: '/products', icon: Grid3x3, label: 'Products', isActive: pathname?.startsWith('/products'), accent: '#6366f1' });
    }

    items.push({
      key: 'mystore',
      href: derivedStoreSlug ? `/store/${derivedStoreSlug}` : '/dashboard',
      icon: Store,
      label: 'My Store',
      isActive: pathname?.startsWith('/store/') ?? false,
      accent: '#14b8a6',
    });

    const ownerDashboardView = ownerStoreView || onPrimaryAddPage;
    const shouldShowDashboardShortcut =
      onAllStoresPage ||
      onHomePage ||
      ownerDashboardView ||
      onDashboardPage;

    if (shouldShowDashboardShortcut) {
      items.push({
        key: 'dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        isActive: pathname?.startsWith('/dashboard') ?? false,
        accent: '#0ea5e9',
      });
    } else {
      items.push({
        key: 'add-primary',
        href: addCtaHref,
        icon: PlusCircle,
        label: addCtaLabel,
        isActive: pathname?.startsWith(addCtaHref) ?? false,
        accent: '#f97316',
      });
    }

    return items;
  }, [addCtaHref, addCtaLabel, derivedStoreSlug, isStorePage, onAllStoresPage, onHomePage, onDashboardPage, onPrimaryAddPage, ownerStoreView, pathname]);

  const drawerItems = useMemo<DrawerItem[]>(() => {
    const items: DrawerItem[] = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/products', icon: Package, label: 'My Products' },
      { href: '/dashboard/subscription', icon: CreditCard, label: 'Subscription' },
    ];
    if (paymentsHubEligible) {
      items.push({ href: '/dashboard/payment-integration', icon: Plug2, label: 'Payment settings' });
    }
    items.push(
      { icon: QrCode, label: 'QR Code', action: () => setQrModalOpen(true) },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
      { icon: LogOut, label: 'Logout', action: handleLogout }
    );
    return items;
  }, [handleLogout, paymentsHubEligible]);

  const publicDrawerItems = useMemo<DrawerItem[]>(
    () => [
      { href: '/', icon: Home, label: 'Home' },
      { href: '/#stores', icon: Store, label: 'Stores' },
      { href: '/#products', icon: Grid3x3, label: 'Products' },
      { icon: PlusCircle, label: 'Create Store', action: handleCreateStore },
    ],
    [handleCreateStore]
  );

  const activeDrawerItems = isLoggedIn ? drawerItems : publicDrawerItems;

  return (
    <>
      {isLoggedIn ? <LoggedInBottomNav items={loggedInNavItems} /> : <LoggedOutBottomNav items={loggedOutNavItems} />}

      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        storeSlug={derivedStoreSlug}
        items={activeDrawerItems}
        userName={user?.name ?? 'User'}
        isLoggedIn={isLoggedIn}
      />
      <QrModal isOpen={qrModalOpen} onClose={closeQrModal} storeShareUrl={storeShareUrl} />

      {toast && <Toast message={toast} />}
    </>
  );
}
