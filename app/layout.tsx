'use client';

import { useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import GoogleTranslateScripts from "@/components/GoogleTranslateScripts";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/src/context/AuthContext";
import { StoreProvider } from "@/src/context/StoreContext";
import { LocationProvider } from "@/src/context/LocationContext";
import { SearchProvider } from "@/src/context/SearchContext";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
  // Navbar is fixed h-16 (64px); need clear space below it so page headings are not clipped.
  const mainTopPadding = showFixedNavbar ? 'pt-20 md:pt-24' : '';

  // Clear fixed MobileBottomNav (h-[68px] + safe area); md:hidden on nav so reset on desktop.
  const mainBottomPaddingClass = hideBottomNav
    ? ''
    : isAllStoresPage
      ? 'pb-[calc(68px+env(safe-area-inset-bottom,0px)+0.375rem)] md:pb-0'
      : 'pb-[calc(68px+env(safe-area-inset-bottom,0px)+1rem)] md:pb-0';
  const mainPaddingClass = `${mainBottomPaddingClass} ${mainTopPadding}`.trim();

  const bodyClassName = `${inter.className} ${isAuthPage ? 'h-screen overflow-hidden' : ''}`;

  useEffect(() => {
    window?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <html lang="en">
      <body className={bodyClassName} suppressHydrationWarning>
        <div id="google_translate_element" style={{ display: 'none' }} aria-hidden="true" />
        <GoogleTranslateScripts />
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
      </body>
    </html>
  );
}
