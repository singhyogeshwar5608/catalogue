'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import {
  formatValidationErrorsForDisplay,
  isApiError,
  parseApiValidationErrors,
} from '@/src/lib/api';
import { resolvePostAuthRedirect } from '@/src/lib/auth-redirect';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, loading, isLoggedIn, user, completeExternalLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ctaMessage, setCtaMessage] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [externalLoading, setExternalLoading] = useState(false);
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);

  const redirectTarget = useMemo(() => {
    const param = searchParams?.get('redirect');
    if (param && param.startsWith('/')) {
      return param;
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    if (!shouldRedirect || !isLoggedIn) {
      return;
    }

    router.replace(resolvePostAuthRedirect(redirectTarget, user));
  }, [shouldRedirect, isLoggedIn, user, router, redirectTarget]);

  const clearGoogleParams = useCallback(() => {
    if (typeof window === 'undefined') return;
    const current = new URL(window.location.href);
    const before = current.search;
    current.searchParams.delete('provider');
    current.searchParams.delete('token');
    current.searchParams.delete('error');
    if (current.search === before) {
      return;
    }
    const nextUrl = `${current.pathname}${current.search}${current.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  useEffect(() => {
    if (!searchParams) return;
    const provider = searchParams.get('provider');
    if (provider !== 'google') return;

    const error = searchParams.get('error');
    if (error) {
      const message =
        error === 'google_email_missing'
          ? 'We could not retrieve your Google email. Please ensure it is shared.'
          : 'Unable to sign in with Google. Please try again.';
      setLoginError(message);
      setSignupError(message);
      clearGoogleParams();
      return;
    }

    const token = searchParams.get('token');
    if (!token) return;

    setExternalLoading(true);
    completeExternalLogin(token)
      .then(() => {
        setLoginError(null);
        setSignupError(null);
        setShouldRedirect(true);
      })
      .catch(() => {
        const message = 'Unable to complete Google login. Please try again.';
        setLoginError(message);
        setSignupError(message);
      })
      .finally(() => {
        setExternalLoading(false);
        clearGoogleParams();
      });
  }, [searchParams, completeExternalLogin, clearGoogleParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await login({ email, password });
      setShouldRedirect(true);
    } catch (error) {
      if (isApiError(error)) {
        const parsed = parseApiValidationErrors(error.payload);
        setLoginError(
          parsed ? formatValidationErrorsForDisplay(parsed, 'auth') : error.message || 'Unable to login',
        );
      } else {
        setLoginError(error instanceof Error ? error.message : 'Unable to login');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    try {
      await register({ name: fullName, email, password });
      setLoginError(null);
      setShouldRedirect(true);
    } catch (error) {
      if (isApiError(error)) {
        const parsed = parseApiValidationErrors(error.payload);
        setSignupError(
          parsed
            ? formatValidationErrorsForDisplay(parsed, 'auth')
            : error.message || 'Unable to create account',
        );
      } else {
        setSignupError(error instanceof Error ? error.message : 'Unable to create account');
      }
    }
  };

  const handleProceedToCreate = () => {
    setCtaMessage(null);
    setView('signup');
    setLoginError(null);
  };

  const onboardingBullets = [
    'No website needed',
    'Share your catalog on WhatsApp',
    'Get more customers',
    'Accept online payments with payment gateway',
    'Manage products and orders in one dashboard',
    'Get a branded online store link instantly',
  ];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain bg-slate-100 px-2.5 py-3 [-webkit-overflow-scrolling:touch] md:min-h-full md:justify-center md:overflow-visible md:px-4 md:py-6">
      <div className="mx-auto flex w-full max-w-[420px] shrink-0 items-start justify-center md:max-w-5xl">
        <div className="grid w-full overflow-hidden rounded-xl border border-gray-200 bg-white md:rounded-2xl md:grid-cols-2">
          <section className="px-3 pt-3 pb-2.5 md:border-r md:border-b-0 md:px-6 md:py-6">
            <div className="relative md:space-y-4">
              <div className="pr-32 pt-2 md:pr-0 md:pt-0 md:space-y-2">
                <h1 className="text-[1.15rem] leading-tight font-bold text-slate-900 md:text-[2rem]">
                  Create Your <span className="text-emerald-500">FREE</span> Catalog
                </h1>
                <p className="mt-1 text-xs font-semibold text-slate-900 md:text-base">in 30 Seconds</p>
              </div>
              <div className="absolute top-0 right-0 md:static md:mt-5">
                <img
                  src="https://res.cloudinary.com/drcfeoi6p/image/upload/v1775726970/create_ihhax6.png"
                  alt="Create free catalog preview"
                  className="h-32 w-32 object-contain md:mx-auto md:h-auto md:max-h-none md:w-full"
                  loading="lazy"
                />
              </div>
            </div>

            <ul className="mt-3.5 space-y-1.5 md:mt-4 md:space-y-2.5">
              {onboardingBullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2.5 text-[11px] font-medium text-slate-800 md:text-base">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mx-auto flex w-full max-w-[360px] flex-col justify-center px-2.5 pt-2 pb-3 space-y-3 md:max-w-none md:min-h-full md:px-5 md:pt-5 md:pb-5 md:space-y-5">
          <div className="space-y-4">
          <GoogleAuthButton
            redirectTo={redirectTarget ?? (view === 'signup' ? '/create-store' : undefined)}
            disabled={externalLoading}
          >
            {externalLoading ? 'Connecting to Google...' : view === 'login' ? 'Sign in with Google' : 'Continue with Google'}
          </GoogleAuthButton>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 md:text-xs">
              <span className="h-px flex-1 bg-gray-200" />
              <span>or continue with email</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </div>

          {view === 'login' ? (
            <form onSubmit={handleEmailLogin} className="space-y-3.5 md:space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-medium text-gray-700 md:text-sm">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 md:h-4 md:w-4" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 text-xs focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 md:py-3 md:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-medium text-gray-700 md:text-sm">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 md:h-4 md:w-4 pointer-events-none" />
                  <input
                    id="password"
                    type={loginPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-11 py-2.5 text-xs focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 md:py-3 md:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setLoginPasswordVisible((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    aria-label={loginPasswordVisible ? 'Hide password' : 'Show password'}
                  >
                    {loginPasswordVisible ? (
                      <EyeOff className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#e8ecff] py-2.5 text-xs font-semibold text-[#0c1323] transition hover:bg-[#dce2ff] disabled:opacity-60 md:py-3 md:text-sm"
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
              {loginError && (
                <p className="whitespace-pre-line text-center text-[11px] text-red-500 md:text-xs">{loginError}</p>
              )}
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3.5 md:space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs font-medium text-gray-700 md:text-sm">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 md:px-4 md:py-3 md:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="signup-email" className="text-xs font-medium text-gray-700 md:text-sm">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 md:h-4 md:w-4" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 text-xs focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 md:py-3 md:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="signup-password" className="text-xs font-medium text-gray-700 md:text-sm">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 md:h-4 md:w-4 pointer-events-none" />
                  <input
                    id="signup-password"
                    type={signupPasswordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-11 py-2.5 text-xs focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 md:py-3 md:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setSignupPasswordVisible((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    aria-label={signupPasswordVisible ? 'Hide password' : 'Show password'}
                  >
                    {signupPasswordVisible ? (
                      <EyeOff className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#e8ecff] py-2.5 text-xs font-semibold text-[#0c1323] transition hover:bg-[#dce2ff] disabled:opacity-60 md:py-3 md:text-sm"
              >
                {loading ? 'Creating account...' : 'Create store'}
              </button>
              {signupError && (
                <p className="whitespace-pre-line text-center text-[11px] text-red-500 md:text-xs">{signupError}</p>
              )}
            </form>
          )}

          <div className="space-y-2">
            {ctaMessage && <p className="text-center text-[11px] text-red-500 md:text-xs">{ctaMessage}</p>}
            {view === 'login' ? (
              <button
                onClick={handleProceedToCreate}
                className="w-full rounded-xl border border-gray-900 py-2.5 text-xs font-semibold text-gray-900 md:py-3 md:text-sm"
              >
                Create store
              </button>
            ) : (
              <button
                onClick={() => {
                  setView('login');
                  setLoginError(null);
                  setSignupError(null);
                }}
                className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-600 md:py-3 md:text-sm"
              >
                Back to login
              </button>
            )}
          </div>
          </section>
        </div>
      </div>
    </div>
  );
}
