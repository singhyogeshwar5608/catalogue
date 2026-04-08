'use client';

import type { Metadata } from "next";
import { useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import AutoTranslate from "@/components/AutoTranslate";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/src/context/AuthContext";
import { StoreProvider } from "@/src/context/StoreContext";
import { LocationProvider } from "@/src/context/LocationContext";
import Script from "next/script";

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
  const hideNavbar = isDashboard;
  const hideFooter = isDashboard || isStorePage || isProductPage || isLoginPage || isCatalogPage;
  const hideBottomNav = isAdminRoute;

  const showFixedNavbar = !hideNavbar && !isStorePage;
  const mainPaddingClass = `${hideBottomNav ? '' : 'pb-0 md:pb-0'} ${showFixedNavbar ? 'pt-2' : ''}`.trim();

  const bodyClassName = `${inter.className} ${isAuthPage ? 'h-screen overflow-hidden' : ''}`;

  useEffect(() => {
    window?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <html lang="en">
      <body className={bodyClassName} suppressHydrationWarning>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
        <Script id="google-translate-init" strategy="afterInteractive">
          {`
            window.googleTranslateElementInit = function() {
              new window.google.translate.TranslateElement(
                { pageLanguage: 'en', autoDisplay: false },
                'google_translate_element'
              );
            }
          `}
        </Script>
        {/* Hidden Google Translate element */}
        <div id="google_translate_element" style={{ display: 'none' }}></div>
        
        {/* Auto-detect and translate based on user's state */}
        {/* <AutoTranslate /> */}
        
        <AuthProvider>
          <StoreProvider>
            <LocationProvider>
              {!hideNavbar && (
                <div className={isStorePage ? 'hidden md:block' : ''}>
                  <Navbar />
                </div>
              )}
              <main className={`min-h-screen ${mainPaddingClass} pt-10`}>{children}</main>
              {!hideFooter && (
                <div className={isCreateStorePage || isAuthPage ? 'hidden md:block' : ''}>
                  <Footer />
                </div>
              )}
              {!hideBottomNav && <MobileBottomNav />}
            </LocationProvider>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
