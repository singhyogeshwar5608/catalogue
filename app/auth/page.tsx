'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { API_BASE_URL } from '@/src/lib/api';

const GoogleGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8445a4.1428 4.1428 0 0 1-1.7977 2.7172v2.2589h2.9081c1.7036-1.5691 2.6851-3.881 2.6851-6.6166Z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.4672-.8059 5.9568-2.1798l-2.9081-2.2589c-.8066.54-1.8376.8591-3.0487.8591-2.3448 0-4.3295-1.5832-5.0376-3.7106H.9572V13.09C2.4377 15.9832 5.4818 18 9 18Z" fill="#34A853" />
    <path d="M3.9624 10.71A5.4089 5.4089 0 0 1 3.6745 9c0-.5944.1038-1.1718.2879-1.71V4.909H.9572A8.9945 8.9945 0 0 0 0 9c0 1.4564.3474 2.8345.9572 4.091l3.0052-2.381Z" fill="#FBBC05" />
    <path d="M9 3.5795c1.3213 0 2.5073.4549 3.4415 1.3484l2.5812-2.5812C13.4629.8914 11.4259 0 9 0 5.4818 0 2.4377 2.0168.9572 4.909l3.0052 2.381c.7081-2.1274 2.6928-3.7105 5.0376-3.7105Z" fill="#EA4335" />
  </svg>
);

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

  const redirectTarget = useMemo(() => {
    const param = searchParams?.get('redirect');
    if (param && param.startsWith('/')) {
      return param;
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    console.log('Redirect check:', { shouldRedirect, isLoggedIn, user });
    
    if (!shouldRedirect || !isLoggedIn) {
      console.log('Redirect blocked:', { shouldRedirect, isLoggedIn });
      return;
    }

    console.log('Redirecting user:', user);
    
    if (redirectTarget) {
      console.log('Redirecting to:', redirectTarget);
      router.replace(redirectTarget);
      return;
    }

    if (user?.storeSlug) {
      console.log('Redirecting to store:', user.storeSlug);
      router.replace(`/store/${user.storeSlug}`);
    } else {
      console.log('Redirecting to create-store');
      router.replace('/create-store');
    }
  }, [shouldRedirect, isLoggedIn, user, router, redirectTarget]);

  const googleRedirectUrl = useMemo(() => {
    const base = API_BASE_URL.replace(/\/+$/, '');
    const url = new URL(`${base}/auth/google/redirect`);
    const desiredRedirect = redirectTarget ?? (view === 'signup' ? '/create-store' : null);
    if (desiredRedirect) {
      url.searchParams.set('redirect', desiredRedirect);
    }
    return url.toString();
  }, [redirectTarget, view]);

  const handleGoogleLogin = () => {
    if (typeof window === 'undefined') return;
    window.location.href = googleRedirectUrl;
  };

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
      setLoginError(error instanceof Error ? error.message : 'Unable to login');
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
      setSignupError(error instanceof Error ? error.message : 'Unable to create account');
    }
  };

  const handleProceedToCreate = () => {
    setCtaMessage(null);
    setView('signup');
    setLoginError(null);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gray-50 px-3 pt-16 pb-24 flex items-start justify-center md:items-center md:px-4 md:pb-0 md:pt-0">
      <div className="w-full max-w-md mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm px-3 pt-2.5 pb-4 space-y-4 md:px-4 md:pt-3 md:pb-5 md:space-y-5">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 md:text-xs">{view === 'login' ? 'Sign in' : 'Sign up'}</p>
          <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">Create your store</h1>
          <p className="text-xs text-gray-600 md:text-sm">
            {view === 'login'
              ? 'Continue with your email to access your store tools.'
              : 'Create a free account to set up your store.'}
          </p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={externalLoading}
            className="w-full rounded-full border border-black/80 bg-black py-2.5 text-xs font-semibold text-white flex items-center justify-center gap-3 shadow-sm transition hover:bg-black/90 focus:ring-2 focus:ring-black/40 disabled:opacity-60 md:py-3 md:text-sm"
          >
            <span className="flex items-center justify-center rounded-full bg-white p-1">
              <GoogleGlyph />
            </span>
            {externalLoading ? 'Connecting to Google...' : view === 'login' ? 'Sign in with Google' : 'Continue with Google'}
          </button>
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 md:h-4 md:w-4" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 text-xs focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 md:py-3 md:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#e8ecff] py-2.5 text-xs font-semibold text-[#0c1323] transition hover:bg-[#dce2ff] disabled:opacity-60 md:py-3 md:text-sm"
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
            {loginError && <p className="text-center text-[11px] text-red-500 md:text-xs">{loginError}</p>}
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 md:h-4 md:w-4" />
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  required
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-2.5 text-xs focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 md:py-3 md:text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#e8ecff] py-2.5 text-xs font-semibold text-[#0c1323] transition hover:bg-[#dce2ff] disabled:opacity-60 md:py-3 md:text-sm"
            >
              {loading ? 'Creating account...' : 'Create store'}
            </button>
            {signupError && <p className="text-center text-[11px] text-red-500 md:text-xs">{signupError}</p>}
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
      </div>
    </div>
  );
}
