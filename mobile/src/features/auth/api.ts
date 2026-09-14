import { apiRequest } from '@/lib/api';
import { AuthResponse, PublicAdmin } from './types';

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export function registerRequest(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload),
  });
}

export function fetchCurrentAdmin(): Promise<PublicAdmin> {
  return apiRequest<PublicAdmin>('/auth/me');
}

export function updateAdminProfile(payload: {
  name?: string;
  email?: string;
}): Promise<PublicAdmin> {
  return apiRequest<PublicAdmin>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function changePasswordRequest(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: true }> {
  return apiRequest<{ success: true }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logoutRequest(): Promise<{ success: true }> {
  return apiRequest<{ success: true }>('/auth/logout', {
    method: 'POST',
  });
}
