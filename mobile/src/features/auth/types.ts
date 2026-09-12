export interface PublicAdmin {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: PublicAdmin;
}
