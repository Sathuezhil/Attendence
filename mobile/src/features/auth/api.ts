import { apiRequest } from '@/lib/api';
import { AuthResponse, PublicAdmin } from './types';

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export function fetchCurrentAdmin(): Promise<PublicAdmin> {
  return apiRequest<PublicAdmin>('/auth/me');
}

export function logoutRequest(): Promise<{ success: true }> {
  return apiRequest<{ success: true }>('/auth/logout', {
    method: 'POST',
  });
}
