'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  loginUser,
  registerUser,
  setAuthToken,
  clearAuthToken,
  getMyStores,
  fetchAuthenticatedUser,
  type ApiUser,
} from '@/src/lib/api';
import type { Store } from '@/types';

const AUTH_STORAGE_KEY = 'catelog-auth-state';

type AuthState = {
  user: ApiUser | null;
  token: string | null;
  isInitialized: boolean;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  isLoggedIn: boolean;
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  completeExternalLogin: (token: string) => Promise<void>;
  logout: () => void;
  setUser: (user: ApiUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const readPersistedState = (): { user: ApiUser | null; token: string | null } => {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const user = parsed.user ?? null;
      const token = parsed.token ?? null;
      if (user && token) {
        return { user, token };
      }
    }
  } catch (error) {
    console.warn('Unable to parse auth cache', error);
  }

  // Legacy fallback: pendingRegistration
  try {
    const legacy = localStorage.getItem('pendingRegistration');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const user: ApiUser = {
        id: parsed?.userData?.id || 'legacy-user',
        name: parsed?.userData?.name || 'Store Owner',
        email: parsed?.userData?.email || '',
        role: 'user',
        storeSlug: parsed?.userData?.storeSlug || parsed?.userData?.username || null,
        stores: parsed?.userData?.stores || [],
      };
      const token = parsed?.token || null;
      if (token) {
        return {
          user,
          token,
        };
      }
    }
  } catch (error) {
    console.warn('Unable to hydrate from legacy state', error);
  }

  return { user: null, token: null };
};

const persistState = (user: ApiUser | null, token: string | null) => {
  try {
    if (!user || !token) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user, token })
    );
  } catch (error) {
    console.warn('Unable to persist auth state', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isInitialized: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { user, token } = readPersistedState();
    if (token) {
      setAuthToken(token);
    }
    setState({ user, token, isInitialized: true });
  }, []);

  useEffect(() => {
    if (!state.user || state.user.storeSlug) {
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const stores = await getMyStores();
        const primaryStore: Store | undefined = stores[0];
        const slug = primaryStore?.username ?? null;

        if (!isMounted || !slug) {
          return;
        }

        setState((previous) => {
          if (!previous.user || previous.user.storeSlug) {
            return previous;
          }

          const updatedUser: ApiUser = {
            ...previous.user,
            storeSlug: slug,
            stores: previous.user.stores && previous.user.stores.length
              ? previous.user.stores
              : primaryStore
              ? [
                  {
                    id: primaryStore.id,
                    name: primaryStore.name,
                    slug: primaryStore.username,
                  },
                ]
              : previous.user.stores ?? [],
          };

          persistState(updatedUser, previous.token);
          return { ...previous, user: updatedUser };
        });
      } catch (error) {
        console.warn('Failed to hydrate store slug', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [state.user]);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    try {
      const response = await loginUser(payload);
      setAuthToken(response.token);
      persistState(response.user, response.token);
      setState({ user: response.user, token: response.token, isInitialized: true });
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setLoading(true);
    try {
      const response = await registerUser(payload);
      setAuthToken(response.token);
      persistState(response.user, response.token);
      setState({ user: response.user, token: response.token, isInitialized: true });
    } finally {
      setLoading(false);
    }
  }, []);

  const completeExternalLogin = useCallback(async (token: string) => {
    setLoading(true);
    try {
      setAuthToken(token);
      const user = await fetchAuthenticatedUser();
      persistState(user, token);
      setState({ user, token, isInitialized: true });
    } catch (error) {
      clearAuthToken();
      persistState(null, null);
      setState({ user: null, token: null, isInitialized: true });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    persistState(null, null);
    clearAuthToken();
    setState({ user: null, token: null, isInitialized: true });
  }, []);

  const setUser = useCallback((nextUser: ApiUser | null) => {
    setState((prev) => {
      const updated = { ...prev, user: nextUser };
      persistState(updated.user, updated.token);
      return updated;
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isLoggedIn: Boolean(state.user && state.token),
    user: state.user,
    token: state.token,
    loading,
    login,
    register,
    completeExternalLogin,
    logout,
    setUser,
  }), [state.user, state.token, loading, login, register, completeExternalLogin, logout, setUser]);

  if (!state.isInitialized) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
