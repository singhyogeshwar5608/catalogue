'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Zap,
  CreditCard,
  Users,
  Menu,
  X,
  ShoppingBag,
  Briefcase,
  LogOut,
  Home,
  Plug2,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { getStoreBySlugFromApi } from '@/src/lib/api';
import { STORE_PROFILE_REFRESH_EVENT, storeCanAccessPaymentIntegrationHub } from '@/src/lib/storeSubscriptionAddons';
import type { Store } from '@/types';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [myStore, setMyStore] = useState<Store | null>(null);

  const loadStore = useCallback(async () => {
    if (!user?.storeSlug) {
      setMyStore(null);
      return;
    }
    try {
      const store = await getStoreBySlugFromApi(user.storeSlug);
      setMyStore(store);
    } catch (error) {
      console.error('Failed to load store:', error);
      setMyStore(null);
    }
  }, [user?.storeSlug]);

  useEffect(() => {
    loadStore();
  }, [loadStore, pathname]);

  useEffect(() => {
    const onRefresh = () => {
      void loadStore();
    };
    window.addEventListener(STORE_PROFILE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(STORE_PROFILE_REFRESH_EVENT, onRefresh);
  }, [loadStore]);

  const businessType = myStore?.businessType || 'product';
  const showPaymentsHub = storeCanAccessPaymentIntegrationHub(myStore);

  const menuItems = [
    { href: '/', icon: Home, label: 'Home Page' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(businessType === 'product' || businessType === 'hybrid' 
      ? [{ href: '/dashboard/products', icon: Package, label: 'Products' }] 
      : []),
    ...(businessType === 'service' || businessType === 'hybrid' 
      ? [{ href: '/dashboard/services', icon: Briefcase, label: 'Services' }] 
      : []),
    // { href: '/dashboard/boost', icon: Zap, label: 'Boost Store' },
    { href: '/dashboard/subscription', icon: CreditCard, label: 'Subscription' },
    ...(showPaymentsHub
      ? [{ href: '/dashboard/payment-integration', icon: Plug2, label: 'Payment settings' } as const]
      : []),
    { href: '/dashboard/referral', icon: Users, label: 'Referrals' },
  ];

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    router.replace('/auth');
  };

  return (
    <>
      {/* Mobile Header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex min-h-[3.75rem] items-center justify-between border-b border-gray-200 bg-white px-4 pb-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold text-gray-900">Cateloge</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-4 pt-[max(5.25rem,env(safe-area-inset-top,0px)+4.25rem)]">
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = false;
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="absolute left-0 right-0 bottom-16 p-4 border-t border-gray-200 bg-white">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 md:border-r md:border-gray-200 md:bg-white">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 px-4 py-6 border-b border-gray-200">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">Cateloge</span>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = false;
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
