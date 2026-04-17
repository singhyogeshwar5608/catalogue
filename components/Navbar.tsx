  'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, User, EllipsisVertical, MapPin, ChevronDown, LogOut, LayoutTemplate, Briefcase } from 'lucide-react';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useStoreSelection } from '@/src/context/StoreContext';
import { useLocationContext } from '@/src/context/LocationContext';
import { useSearch } from '@/src/context/SearchContext';
import { getCityLabel, getDistrictStateLabel, searchLocations } from '@/src/lib/location';
import { searchAll } from '@/src/lib/api';
import type { LocationSuggestion } from '@/src/lib/location';
import type { Product, Service, Store, UnifiedSearchResult } from '@/types';
import LanguageToggle from '@/components/LanguageToggle';
import desktopLogo from '@/assets/Larawans.svg';

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [desktopSearchQuery, setDesktopSearchQuery] = useState('');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [desktopSearchResults, setDesktopSearchResults] = useState<Store[]>([]);
  const [desktopProductResults, setDesktopProductResults] = useState<Product[]>([]);
  const [desktopServiceResults, setDesktopServiceResults] = useState<Service[]>([]);
  const [desktopSearchMeta, setDesktopSearchMeta] = useState<Pick<
    UnifiedSearchResult,
    'location' | 'lat' | 'lng' | 'types'
  > | null>(null);
  const [isDesktopSearching, setIsDesktopSearching] = useState(false);
  const [desktopSearchError, setDesktopSearchError] = useState<string | null>(null);
  const [isDesktopPopoverOpen, setIsDesktopPopoverOpen] = useState(false);
  const { isLoggedIn, user, logout } = useAuth();
  const { selectedStore } = useStoreSelection();
  const { searchQuery, setSearchQuery } = useSearch();
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [storeLoginMenuOpen, setStoreLoginMenuOpen] = useState(false);
  const [isMobileLocationOpen, setIsMobileLocationOpen] = useState(false);
  const storeCtaRef = useRef<HTMLDivElement>(null);
  const quickSearchRef = useRef<HTMLDivElement>(null);
  const quickSearchDropdownRef = useRef<HTMLDivElement>(null);
  const desktopSearchWrapperRef = useRef<HTMLDivElement>(null);
  const suggestionControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    const targets = ['/', '/products', '/all-stores', '/auth', '/create-store', '/dashboard'];
    targets.forEach((href) => {
      try {
        router.prefetch(href);
      } catch {
        /* ignore */
      }
    });
  }, [router]);

  const {
    location,
    isLoading: locationLoading,
    error: locationError,
    setManualLocation,
    setSuggestedLocation,
  } = useLocationContext();

  const locationChipLabel = location
    ? getCityLabel(location.label)
    : locationLoading
      ? 'Detecting...'
      : 'Select location';
  const suggestedLocationLabel = location ? getDistrictStateLabel(location.label) : '';

  const toggleLocationMenu = () => {
    setIsMobileSearchOpen(false);
    setIsLocationMenuOpen((prev) => {
      const next = !prev;
      if (!prev) {
        setLocationSearch(location ? getCityLabel(location.label) : '');
      }
      return next;
    });
  };

  const applyTypedLocation = async () => {
    const value = locationSearch.trim();
    if (value.length === 0) return;
    await setManualLocation(value);
    setIsLocationMenuOpen(false);
    setIsMobileLocationOpen(false);
  };

  const handleLocationInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyTypedLocation();
    }
  };

  const handleStoreLogout = () => {
    logout();
    setStoreMenuOpen(false);
    setStoreLoginMenuOpen(false);
    router.replace('/');
  };

  const trimmedLocationSearch = locationSearch.trim();

  const handleMobileSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      event.preventDefault();
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleDesktopSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      event.preventDefault();
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleQuickSearchKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && quickSearchQuery.trim()) {
      event.preventDefault();
      router.push(`/?q=${encodeURIComponent(quickSearchQuery.trim())}`);
      setIsQuickSearchOpen(false);
    }
  };

  useEffect(() => {
    const query = desktopSearchQuery.trim();
    if (!query) {
      setDesktopSearchResults([]);
      setDesktopProductResults([]);
      setDesktopServiceResults([]);
      setDesktopSearchMeta(null);
      setDesktopSearchError(null);
      setIsDesktopSearching(false);
      return;
    }

    setIsDesktopSearching(true);
    setDesktopSearchError(null);
    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const searchResponse = await searchAll({
          query,
          location: location?.label ?? undefined,
          lat: typeof location?.latitude === 'number' ? location.latitude : undefined,
          lng: typeof location?.longitude === 'number' ? location.longitude : undefined,
          radiusKm:
            typeof location?.latitude === 'number' && typeof location?.longitude === 'number'
              ? 50
              : undefined,
          limits: { stores: 6, products: 6, services: 6 },
        });
        if (isCancelled) {
          return;
        }

        setDesktopSearchResults(searchResponse.stores);
        setDesktopProductResults(searchResponse.products);
        setDesktopServiceResults(searchResponse.services);
        setDesktopSearchMeta({
          location: searchResponse.location,
          lat: searchResponse.lat,
          lng: searchResponse.lng,
          types: searchResponse.types,
        });

        const hasAnyResults =
          searchResponse.stores.length > 0 ||
          searchResponse.products.length > 0 ||
          searchResponse.services.length > 0;
        setDesktopSearchError(
          hasAnyResults ? null : `No matching stores, products, or services for “${query}” yet.`
        );
      } catch (error) {
        console.error('Desktop search failed', error);
        setDesktopSearchResults([]);
        setDesktopProductResults([]);
        setDesktopServiceResults([]);
        setDesktopSearchMeta(null);
        setDesktopSearchError('Unable to search right now. Please try again.');
      } finally {
        if (!isCancelled) {
          setIsDesktopSearching(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [desktopSearchQuery, location]);

  const trimmedDesktopSearch = desktopSearchQuery.trim();
  const hasDesktopResults =
    desktopSearchResults.length > 0 || desktopProductResults.length > 0 || desktopServiceResults.length > 0;
  const showDesktopResultsPopover = Boolean(
    trimmedDesktopSearch && (isDesktopSearching || hasDesktopResults || desktopSearchError)
  );
  const shouldShowDesktopResults = isDesktopPopoverOpen && showDesktopResultsPopover;

  useEffect(() => {
    if (!isDesktopPopoverOpen) {
      return;
    }

    const handleClickAway = (event: MouseEvent) => {
      if (desktopSearchWrapperRef.current && !desktopSearchWrapperRef.current.contains(event.target as Node)) {
        setIsDesktopPopoverOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDesktopPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDesktopPopoverOpen]);

  useEffect(() => {
    if (!trimmedDesktopSearch) {
      setIsDesktopPopoverOpen(false);
    }
  }, [trimmedDesktopSearch]);

  const handleSuggestionSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      setSuggestedLocation(suggestion);
      setLocationSearch(suggestion.city);
      setIsLocationMenuOpen(false);
      setIsMobileLocationOpen(false);
      setSuggestions([]);
    },
    [setSuggestedLocation]
  );

  useEffect(() => {
    if (!isLocationMenuOpen && !isMobileLocationOpen) {
      suggestionControllerRef.current?.abort();
      setIsFetchingSuggestions(false);
      return;
    }

    if (trimmedLocationSearch.length < 2) {
      suggestionControllerRef.current?.abort();
      setSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }

    suggestionControllerRef.current?.abort();
    const controller = new AbortController();
    suggestionControllerRef.current = controller;
    setIsFetchingSuggestions(true);

    searchLocations(trimmedLocationSearch, 6, controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) {
          setSuggestions(results);
        }
      })
      .catch((error) => {
        if ((error as Error)?.name !== 'AbortError') {
          console.warn('Location suggestions failed', error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingSuggestions(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isLocationMenuOpen, isMobileLocationOpen, trimmedLocationSearch]);


  const suggestionRows = useMemo(() => {
    if (isFetchingSuggestions) {
      return [
        <div key="loading" className="px-3 py-2 text-xs text-gray-500">
          Searching for locations…
        </div>,
      ];
    }

    if (trimmedLocationSearch.length < 2) {
      return [
        <div key="hint" className="px-3 py-2 text-xs text-gray-500">
          Type at least 2 letters to see suggestions.
        </div>,
      ];
    }

    if (suggestions.length === 0) {
      return [
        <div key="empty" className="px-3 py-2 text-xs text-gray-500">
          No matching locations found.
        </div>,
      ];
    }

    return suggestions.map((suggestion) => (
      <button
        key={`${suggestion.latitude}-${suggestion.longitude}`}
        type="button"
        onClick={() => handleSuggestionSelect(suggestion)}
        className="w-full text-left px-3 py-2 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <p className="text-sm font-semibold text-gray-900">{suggestion.city}</p>
        <p className="text-xs text-gray-500">
          {[suggestion.district, suggestion.state].filter(Boolean).join(', ') || suggestion.label}
        </p>
      </button>
    ));
  }, [handleSuggestionSelect, isFetchingSuggestions, suggestions, trimmedLocationSearch]);

  const renderSuggestionList = () => (
    <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white/90 shadow-inner">
      {suggestionRows}
    </div>
  );

  const handleMobileNavNavigate = () => {
    setIsMenuOpen(false);
    setIsMobileSearchOpen(false);
  };

  useEffect(() => {
    if (!storeMenuOpen && !isQuickSearchOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (storeCtaRef.current && !storeCtaRef.current.contains(event.target as Node)) {
        setStoreMenuOpen(false);
      }
      if (
        quickSearchRef.current &&
        !quickSearchRef.current.contains(event.target as Node) &&
        quickSearchDropdownRef.current &&
        !quickSearchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsQuickSearchOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setStoreMenuOpen(false);
        setIsQuickSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [storeMenuOpen, isQuickSearchOpen]);

  useEffect(() => {
    const root = document.documentElement;
    const measureHeight = () => {
      if (isQuickSearchOpen && quickSearchDropdownRef.current) {
        root.style.setProperty('--mobile-quick-search-height', `${quickSearchDropdownRef.current.offsetHeight}px`);
      } else {
        root.style.setProperty('--mobile-quick-search-height', '0px');
      }
    };

    measureHeight();

    if (!isQuickSearchOpen) {
      return () => {
        root.style.setProperty('--mobile-quick-search-height', '0px');
      };
    }

    window.addEventListener('resize', measureHeight);

    return () => {
      window.removeEventListener('resize', measureHeight);
      root.style.setProperty('--mobile-quick-search-height', '0px');
    };
  }, [isQuickSearchOpen, quickSearchQuery]);

  const handleStoreButtonClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isLoggedIn) {
      event.preventDefault();
      setStoreMenuOpen((prev) => !prev);
    }
  };

  const currentStoreSlug = selectedStore?.slug ?? user?.storeSlug ?? null;

  const storePrimaryCta = useMemo(() => {
    if (!isLoggedIn) {
      return {
        label: 'Create Store',
        href: '/auth',
      };
    }

    if (currentStoreSlug) {
      return {
        label: 'View Store',
        href: `/store/${currentStoreSlug}`,
      };
    }

    return {
      label: 'Finish Store Setup',
      href: '/create-store',
    };
  }, [currentStoreSlug, isLoggedIn]);

  const hasStore = Boolean(currentStoreSlug);

  return (
    <>
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center">
              <Image src={desktopLogo} alt="Larawans" className="h-9 w-auto object-contain md:h-10" priority />
            </Link>
            
            <div className="hidden md:flex items-center gap-4 text-sm">
              <Link href="/" className="text-gray-700 hover:text-primary transition">
                {'Home'}
              </Link>
              <Link href="/all-stores" className="text-gray-700 hover:text-primary transition">
                {'All Store'}
              </Link>
              <Link href="/products" className="text-gray-700 hover:text-primary transition">
                {'Products'}
              </Link>
            </div>
          </div>

          <div className="hidden md:flex flex-1 justify-center px-4">
            <div ref={desktopSearchWrapperRef} className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setDesktopSearchQuery(nextValue);
                  setSearchQuery(nextValue);
                  setIsDesktopPopoverOpen(Boolean(nextValue.trim()));
                }}
                onKeyDown={handleDesktopSearchKey}
                onFocus={() => setIsDesktopPopoverOpen(Boolean(desktopSearchQuery.trim()))}
                placeholder={'Search stores or products...'}
                className="w-full rounded-full border border-slate-800 bg-slate-900/95 pl-10 pr-3 py-1.5 text-sm font-medium text-white placeholder:text-slate-400 shadow-[0_12px_25px_-18px_rgba(15,23,42,0.8)] focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              {shouldShowDesktopResults && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-900/10">
                  <div className="max-h-[28rem] overflow-y-auto pr-1">
                    {isDesktopSearching ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        Searching for “{trimmedDesktopSearch}”
                      </div>
                    ) : hasDesktopResults ? (
                      <div className="space-y-4">
                        {desktopSearchResults.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Stores</p>
                              <span className="text-[11px] text-slate-400">{desktopSearchResults.length}</span>
                            </div>
                            <div className="space-y-2">
                              {desktopSearchResults.map((store) => (
                                <Link
                                  key={store.id}
                                  href={`/store/${store.username}`}
                                  onClick={() => setIsDesktopPopoverOpen(false)}
                                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/80 px-3.5 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                                >
                                  <div className="flex flex-1 flex-col">
                                    <span className="text-sm font-semibold text-slate-900">{store.name}</span>
                                    <span className="text-xs text-slate-500">
                                      {[store.categoryName ?? store.businessType, store.location].filter(Boolean).join(' • ')}
                                    </span>
                                  </div>
                                  {store.isVerified ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                                      Verified
                                    </span>
                                  ) : null}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {desktopProductResults.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Products</p>
                              <span className="text-[11px] text-slate-400">{desktopProductResults.length}</span>
                            </div>
                            <div className="space-y-2">
                              {desktopProductResults.map((product) => (
                                <Link
                                  key={product.id}
                                  href={`/store/${product.storeSlug ?? product.storeId}`}
                                  onClick={() => setIsDesktopPopoverOpen(false)}
                                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-3.5 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                                >
                                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-100">
                                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                                  </div>
                                  <div className="flex flex-1 flex-col overflow-hidden">
                                    <span className="truncate text-sm font-semibold text-slate-900">{product.name}</span>
                                    <span className="truncate text-[11px] text-slate-500">{product.storeName}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-slate-900">₹{product.price}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {desktopServiceResults.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Services</p>
                              <span className="text-[11px] text-slate-400">{desktopServiceResults.length}</span>
                            </div>
                            <div className="space-y-2">
                              {desktopServiceResults.map((service) => (
                                <Link
                                  key={service.id}
                                  href={`/store/${service.storeSlug ?? service.storeId}`}
                                  onClick={() => setIsDesktopPopoverOpen(false)}
                                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-3.5 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                                >
                                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-100">
                                    <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
                                  </div>
                                  <div className="flex flex-1 flex-col overflow-hidden">
                                    <span className="truncate text-sm font-semibold text-slate-900">{service.title}</span>
                                    <span className="truncate text-[11px] text-slate-500">{service.storeName}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-slate-900">
                                    {service.price != null ? `₹${service.price}` : 'Custom quote'}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        {desktopSearchError ?? 'No matches yet. Try a different keyword.'}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    <span>
                      Search across store names, product titles, services, and locations in real time.
                    </span>
                    <Link
                      href={`/all-stores?q=${encodeURIComponent(trimmedDesktopSearch)}`}
                      onClick={() => setIsDesktopPopoverOpen(false)}
                      className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                      View all matches
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ml-auto flex translate-x-1 items-center gap-0 md:ml-auto md:translate-x-0 md:gap-3">
            <div className="relative">
              <button
                onClick={toggleLocationMenu}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-sky-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] px-2 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 md:ml-0 md:h-[30px] md:gap-1.5 md:px-2.5 md:text-xs"
                translate="no"
              >
                <MapPin className="h-3.5 w-3.5 text-primary-700 md:h-4 md:w-4" />
                <span className="max-w-[48px] truncate font-medium md:hidden" translate="no">{locationChipLabel}</span>
                <span className="hidden md:inline font-medium whitespace-nowrap text-sm" translate="no">{locationChipLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition md:h-4 md:w-4 ${isLocationMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLocationMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 max-w-[82vw] rounded-2xl border border-gray-200 bg-white p-3 shadow-lg md:w-64 md:max-w-[90vw] md:rounded-xl md:p-4">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-gray-500 md:mb-3 md:text-xs md:tracking-widest">{'Choose location'}</p>
                  <div className="mb-2 md:mb-3">
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      onKeyDown={handleLocationInputKey}
                      placeholder={'Type city name...'}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary md:text-sm"
                    />
                    {suggestedLocationLabel && (
                      <p className="mt-1 text-[10px] text-gray-500 md:text-[11px]">
                        {'Currently set to'}: {suggestedLocationLabel}
                      </p>
                    )}
                  </div>
                  {locationError && (
                    <p className="mb-2 text-[11px] text-red-500">{locationError}</p>
                  )}
                  {renderSuggestionList()}
                </div>
              )}
            </div>

            <div className="relative ml-1 flex items-center gap-1.5 md:hidden" ref={quickSearchRef}>
              <LanguageToggle appearance="pill" className="h-8 px-2.5 text-[11px] min-h-0" showLabelOnMobile />
              <button
                type="button"
                onClick={() => setIsQuickSearchOpen((prev) => !prev)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-slate-600 transition ${
                  isQuickSearchOpen ? 'border-slate-400 bg-slate-50 shadow-inner' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                aria-label="Toggle quick search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3 text-sm">
              <LanguageToggle appearance="pill" showLabelOnDesktop />

              {isLoggedIn ? (
                <div className="relative" ref={storeCtaRef}>
                  <Link
                    href={storePrimaryCta.href}
                    onClick={handleStoreButtonClick}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_55%,#0f172a_100%)] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_14px_30px_-18px_rgba(37,99,235,0.85)] transition hover:-translate-y-0.5 hover:brightness-110"
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    <span>{storePrimaryCta.label}</span>
                  </Link>
                  {storeMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                      {hasStore && (
                        <Link
                          href="/dashboard"
                          className="block px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 transition"
                          onClick={() => setStoreMenuOpen(false)}
                        >
                          {'Dashboard'}
                        </Link>
                      )}
                      <button
                        onClick={handleStoreLogout}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        {'Logout'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition"
                >
                  <User className="w-4 h-4" />
                  <span className="font-medium">{'Create Store'}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {isMobileSearchOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setMobileSearchQuery(event.target.value);
                  setSearchQuery(event.target.value);
                }}
                onKeyDown={handleMobileSearchKey}
                placeholder="Search stores or products"
                className="w-full rounded-2xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsMobileLocationOpen((prev) => !prev)}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> {locationChipLabel}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${isMobileLocationOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMobileLocationOpen && (
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs uppercase text-gray-500 tracking-widest mb-2">{'Update location'}</p>
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      onKeyDown={handleLocationInputKey}
                      placeholder={'Type city name...'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {locationError && (
                      <p className="text-xs text-red-500 mt-2">{locationError}</p>
                    )}
                    {renderSuggestionList()}
                  </div>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={'Search'}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Link href="/" onClick={handleMobileNavNavigate} className="text-gray-700 hover:text-primary transition">
                {'Home'}
              </Link>
              <Link href="/all-stores" onClick={handleMobileNavNavigate} className="text-gray-700 hover:text-primary transition">
                {'All Store'}
              </Link>
              <Link href="/#products" onClick={handleMobileNavNavigate} className="text-gray-700 hover:text-primary transition">
                {'Products'}
              </Link>

              {isLoggedIn ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href={hasStore ? `/store/${currentStoreSlug}` : '/create-store'}
                    onClick={handleMobileNavNavigate}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition text-center"
                  >
                    {hasStore ? 'View Store' : 'Finish Store Setup'}
                  </Link>
                  {hasStore && (
                    <Link
                      href="/dashboard"
                      onClick={handleMobileNavNavigate}
                      className="px-4 py-2 border border-primary text-primary rounded-lg text-center hover:bg-primary-50"
                    >
                      {'Dashboard'}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleStoreLogout();
                      handleMobileNavNavigate();
                    }}
                    className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-center"
                  >
                    {'Logout'}
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  onClick={handleMobileNavNavigate}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition text-center"
                >
                  {'Create Store'}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      {isQuickSearchOpen && (
        <div
          ref={quickSearchDropdownRef}
          className="md:hidden border-t border-slate-200 bg-white px-0.5 py-0 shadow-sm"
        >
          <div className="mx-auto py-2 flex max-w-7xl items-center rounded-2xl border border-slate-900/20 bg-slate-900 px-4 shadow">
            <Search className="h-4 w-4 text-white/80" />
            <input
              type="text"
              value={quickSearchQuery}
              onChange={(event) => setQuickSearchQuery(event.target.value)}
              onKeyDown={handleQuickSearchKey}
              placeholder="Search stores, categories, or location"
              className="ml-3 flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/70 focus:outline-none"
            />
          </div>
        </div>
      )}
    </nav>
    </>
  );
}
