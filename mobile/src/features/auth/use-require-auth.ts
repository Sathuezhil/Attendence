import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from './auth-context';

export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isReady && !auth.isAuthenticated) {
      router.replace('/login');
    }
  }, [auth.isAuthenticated, auth.isReady]);

  return auth;
}
