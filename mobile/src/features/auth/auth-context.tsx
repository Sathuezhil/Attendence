import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, setSessionExpiredListener } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { secureStorage } from '@/lib/secure-storage';
import {
  fetchCurrentAdmin,
  loginRequest,
  logoutRequest,
  registerRequest,
  subscribeAuth,
} from './api';
import { PublicAdmin } from './types';

interface AuthContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  user: PublicAdmin | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<PublicAdmin | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = subscribeAuth(async (uid) => {
      try {
        if (!uid) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const currentUser = await fetchCurrentAdmin();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await secureStorage.clearTokens();
        }
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setSessionExpiredListener(() => {
      queryClient.clear();
      setUser(null);
    });

    return () => {
      setSessionExpiredListener(null);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isAuthenticated: Boolean(user),
      user,
      async login(email: string, password: string) {
        const result = await loginRequest(email, password);
        await secureStorage.setAccessToken(result.accessToken);
        await secureStorage.setRefreshToken(result.refreshToken);
        setUser(result.user);
      },
      async register(name: string, email: string, password: string) {
        const result = await registerRequest({ name, email, password });
        await secureStorage.setAccessToken(result.accessToken);
        await secureStorage.setRefreshToken(result.refreshToken);
        setUser(result.user);
      },
      async logout() {
        try {
          await logoutRequest();
        } catch {
          // Local session is cleared even if the network call fails.
        } finally {
          await secureStorage.clearTokens();
          queryClient.clear();
          setUser(null);
        }
      },
      async refreshProfile() {
        const currentUser = await fetchCurrentAdmin();
        setUser(currentUser);
      },
    }),
    [isReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
