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

  if (
    rest.body &&
    !(rest.body instanceof FormData) &&
    !requestHeaders.has('Content-Type')
  ) {
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

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  skipRefresh = false,
): Promise<T> {
  const accessToken = await secureStorage.getAccessToken();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getApiBaseUrl()}${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 401 && !skipRefresh) {
        const nextAccessToken = await refreshAccessToken();
        if (nextAccessToken) {
          try {
            resolve(await apiUpload<T>(path, formData, onProgress, true));
          } catch (error) {
            reject(error);
          }
          return;
        }
      }

      let body: unknown = null;
      try {
        body = xhr.responseText ? (JSON.parse(xhr.responseText) as unknown) : null;
      } catch {
        body = null;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ApiError(getErrorMessage(body, xhr.status), xhr.status));
        return;
      }

      resolve(body as T);
    };

    xhr.onerror = () => {
      reject(new ApiError('Unable to connect to the server. Check your connection.', 0));
    };

    xhr.send(formData);
  });
}

export async function apiRequestBinary(path: string): Promise<{
  bytes: ArrayBuffer;
  contentType: string;
  fileName: string | null;
}> {
  const headers = new Headers({ Accept: '*/*' });
  const accessToken = await secureStorage.getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { headers });
  } catch {
    throw new ApiError('Unable to connect to the server. Check your connection.', 0);
  }

  if (response.status === 401) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      return apiRequestBinary(path);
    }
    throw new ApiError(messageForStatus(401), 401);
  }

  if (!response.ok) {
    const body = await parseJson(response);
    throw new ApiError(getErrorMessage(body, response.status), response.status);
  }

  const disposition = response.headers.get('content-disposition');
  const fileNameMatch = disposition?.match(/filename="([^"]+)"/);

  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    fileName: fileNameMatch?.[1] ?? null,
  };
}
