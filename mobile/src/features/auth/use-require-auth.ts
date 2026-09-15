import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from './auth-context';

export function useRequireAuth(options?: { allowEmployee?: boolean }) {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isReady) {
      return;
    }
    if (!auth.isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (auth.user?.role === 'EMPLOYEE' && !options?.allowEmployee) {
      router.replace('/me');
    }
  }, [auth.isAuthenticated, auth.isReady, auth.user?.role, options?.allowEmployee]);

  return auth;
}
