'use client';

import { useEffect, useState } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import GoogleTranslateScripts from "@/components/GoogleTranslateScripts";
import NavigationProgress from "@/components/NavigationProgress";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/src/context/AuthContext";
import { StoreProvider } from "@/src/context/StoreContext";
import { LocationProvider } from "@/src/context/LocationContext";
import { SearchProvider } from "@/src/context/SearchContext";
import { getStoreBySlugFromApi, getStoredUser } from "@/src/lib/api";
import faviconIcon from "@/assets/icon-512x512.svg";

export default function RootLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const isAdminRoute = pathname?.startsWith('/admin');
  const isDashboard = isDashboardRoute || isAdminRoute;
  const isStorePage = pathname?.startsWith('/store');
  const isCatalogPage = pathname?.startsWith('/catalog');
  const isProductPage = pathname?.startsWith('/product');
  const isLoginPage = pathname === '/login';
  const isCreateStorePage = pathname === '/create-store';
  const isAuthPage = pathname === '/auth';
  const isAllStoresPage = pathname === '/all-stores';
  const hideNavbar = isDashboard;
  const hideFooter = isDashboard || isStorePage || isProductPage || isLoginPage || isCatalogPage;
  const hideBottomNav = isAdminRoute;

  const showFixedNavbar = !hideNavbar && !isStorePage;
  const mainTopPadding = showFixedNavbar ? 'pt-20 md:pt-24' : '';
  const isAuthLikePage = isAuthPage || isLoginPage || isCreateStorePage;

  const mainBottomPaddingClass = hideBottomNav
    ? ''
    : isAuthLikePage
      ? 'pb-0 md:pb-0'
    : isAllStoresPage
      ? 'pb-[calc(68px+env(safe-area-inset-bottom,0px)+0.375rem)] md:pb-0'
      : 'pb-[calc(68px+env(safe-area-inset-bottom,0px)+0.8rem)] md:pb-0';
  const mainPaddingClass = `${mainBottomPaddingClass} ${mainTopPadding}`.trim();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    window?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  /** Favicon: default website logo; on dashboard use store logo (if available). */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cancelled = false;
    const setFavicon = (href: string) => {
      const head = document.head;
      const ensure = (rel: string) => {
        let el = head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
        if (!el) {
          el = document.createElement('link');
          el.rel = rel;
          head.appendChild(el);
        }
        el.href = href;
      };
      ensure('icon');
      ensure('shortcut icon');
      ensure('apple-touch-icon');
    };

    // Always reset to website favicon first (avoids showing previous store favicon while loading).
    setFavicon(faviconIcon.src);

    const isDashboardLike = Boolean(pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin'));
    if (!isDashboardLike) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const slug = getStoredUser()?.storeSlug?.trim();
        if (!slug) return;
        const store = await getStoreBySlugFromApi(slug);
        if (cancelled) return;
        const logo = store?.logo?.trim();
        if (!logo) return;
        // Bust favicon cache so switching stores updates immediately.
        const version = (store as any)?.updatedAt ?? (store as any)?.createdAt ?? Date.now();
        const url = `${logo}${logo.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(version))}`;
        setFavicon(url);
      } catch {
        // ignore: fall back to global favicon
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      <NavigationProgress />
      {mounted ? (
        <>
          <div id="google_translate_element" style={{ display: 'none' }} aria-hidden="true" />
          <GoogleTranslateScripts />
        </>
      ) : null}
      <AuthProvider>
        <StoreProvider>
          <LocationProvider>
            <SearchProvider>
              {!hideNavbar && (
                <div className={isStorePage ? 'hidden md:block' : ''}>
                  <Navbar />
                </div>
              )}
              <main className={`min-h-screen ${mainPaddingClass}`}>{children}</main>
              {!hideFooter && (
                <div className={isCreateStorePage || isAuthPage ? 'hidden md:block' : ''}>
                  <Footer />
                </div>
              )}
              {!hideBottomNav && <MobileBottomNav />}
            </SearchProvider>
          </LocationProvider>
        </StoreProvider>
      </AuthProvider>
    </>
  );
}
