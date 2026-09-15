import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, setSessionExpiredListener } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { secureStorage } from '@/lib/secure-storage';
import {
  loginRequest,
  logoutRequest,
  registerEmployeeRequest,
  registerRequest,
  resolveSession,
  subscribeAuth,
} from './api';
import { AuthUser } from './types';

interface AuthContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  registerEmployee: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

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

        const currentUser = await resolveSession();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (error) {
        const denied = error instanceof ApiError && (error.status === 401 || error.status === 403);
        if (denied) {
          if (uid) {
            try {
              await logoutRequest();
            } catch {
              // Session restore failed; clear local auth anyway.
            }
          }
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
      async registerEmployee(firstName: string, lastName: string, email: string, password: string) {
        const result = await registerEmployeeRequest({ firstName, lastName, email, password });
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
        const currentUser = await resolveSession();
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
