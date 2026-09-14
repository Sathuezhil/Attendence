export const DEFAULT_DOCUMENT_WARNING_DAYS = 30;
export const DEFAULT_DOCUMENT_URGENT_DAYS = 7;

export type DocumentExpiryStatus =
  'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

export type DocumentExpiryAlert =
  'VALID' | 'EXPIRING_SOON' | 'URGENT_EXPIRY' | 'EXPIRED' | 'NO_EXPIRY';

export interface ExpiryThresholds {
  warningDays: number;
  urgentDays: number;
}

export function normalizeExpiryThresholds(
  warningDays: number,
  urgentDays: number,
): ExpiryThresholds {
  const warning = Number.isFinite(warningDays)
    ? Math.max(0, Math.floor(warningDays))
    : DEFAULT_DOCUMENT_WARNING_DAYS;
  const urgent = Number.isFinite(urgentDays)
    ? Math.max(0, Math.floor(urgentDays))
    : DEFAULT_DOCUMENT_URGENT_DAYS;

  return {
    warningDays: warning,
    urgentDays: Math.min(urgent, warning),
  };
}

export function resolveWarningDays(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { days?: unknown }).days === 'number'
  ) {
    return Math.floor((value as { days: number }).days);
  }

  return fallback;
}

export function calculateExpiryStatus(
  expiryDate: Date | null | undefined,
  today: Date,
  warningDays: number,
): DocumentExpiryStatus {
  if (!expiryDate) {
    return 'NO_EXPIRY';
  }

  const expiry = Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate(),
  );
  const current = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const daysUntilExpiry = Math.round((expiry - current) / 86_400_000);

  if (daysUntilExpiry < 0) {
    return 'EXPIRED';
  }

  if (daysUntilExpiry <= warningDays) {
    return 'EXPIRING_SOON';
  }

  return 'VALID';
}

export function daysUntilExpiry(expiryDate: Date, today: Date): number {
  const expiry = Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate(),
  );
  const current = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  return Math.round((expiry - current) / 86_400_000);
}

export function calculateExpiryAlert(
  expiryDate: Date | null | undefined,
  today: Date,
  thresholds: ExpiryThresholds,
): DocumentExpiryAlert {
  if (!expiryDate) {
    return 'NO_EXPIRY';
  }

  const days = daysUntilExpiry(expiryDate, today);
  if (days < 0) {
    return 'EXPIRED';
  }
  if (days <= thresholds.urgentDays) {
    return 'URGENT_EXPIRY';
  }
  if (days <= thresholds.warningDays) {
    return 'EXPIRING_SOON';
  }
  return 'VALID';
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  );
}
