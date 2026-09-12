import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { AuthResponse } from '@/features/auth/types';
import { secureStorage } from '@/lib/secure-storage';

function inferDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0] ?? null;
}

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) {
    return configured;
  }

  const host = inferDevHost();
  if (host) {
    return `http://${host}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function messageForStatus(status: number): string {
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You do not have permission to do that.';
  }

  if (status >= 500) {
    return 'The server is unavailable. Please try again.';
  }

  return `Request failed with status ${status}`;
}

function getErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) {
      const joined = message.filter((item): item is string => typeof item === 'string').join('\n');
      if (joined) {
        return joined;
      }
    }

    if (typeof message === 'string' && message && message !== 'Unauthorized') {
      return message;
    }
  }

  return messageForStatus(status);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const body = await parseJson(response);
    if (!response.ok) {
      await secureStorage.clearTokens();
      return null;
    }

    const data = body as AuthResponse;
    await secureStorage.setAccessToken(data.accessToken);
    await secureStorage.setRefreshToken(data.refreshToken);
    return data.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
  skipRefresh?: boolean;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, skipRefresh = false, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (rest.body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const accessToken = await secureStorage.getAccessToken();
    if (accessToken) {
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      headers: requestHeaders,
    });
  } catch {
    throw new ApiError('Unable to connect to the server. Check your connection.', 0);
  }

  if (response.status === 401 && auth && !skipRefresh) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
  }

  const body = await parseJson(response);
  if (!response.ok) {
    throw new ApiError(getErrorMessage(body, response.status), response.status);
  }

  return body as T;
}

export interface HealthCheckResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  database: 'connected' | 'disconnected';
}

export function fetchHealth(): Promise<HealthCheckResponse> {
  return apiRequest<HealthCheckResponse>('/health', { auth: false });
}
