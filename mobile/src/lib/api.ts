type SessionExpiredListener = () => void;
let sessionExpiredListener: SessionExpiredListener | null = null;
let sessionExpiredNotified = false;

export function setSessionExpiredListener(listener: SessionExpiredListener | null): void {
  sessionExpiredListener = listener;
  sessionExpiredNotified = false;
}

export function notifySessionExpired(): void {
  if (sessionExpiredNotified) {
    return;
  }

  sessionExpiredNotified = true;
  sessionExpiredListener?.();
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

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  database: 'connected' | 'disconnected';
}

export async function fetchHealth(): Promise<HealthCheckResponse> {
  const timestamp = new Date().toISOString();
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: 'error',
      service: 'firestore',
      timestamp,
      database: 'disconnected',
    };
  }

  return {
    status: 'ok',
    service: 'firestore',
    timestamp,
    database: 'connected',
  };
}
