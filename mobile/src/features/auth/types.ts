export type AuthRole = 'ADMIN' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  employeeId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicAdmin = AuthUser;

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function homeHref(role?: AuthRole | null): '/dashboard' | '/me' {
  return role === 'EMPLOYEE' ? '/me' : '/dashboard';
}
