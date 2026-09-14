export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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
