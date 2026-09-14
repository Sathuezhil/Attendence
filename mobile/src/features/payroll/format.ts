import { PaymentStatus } from './types';

export function monthLabel(month: number): string {
  return new Date(Date.UTC(2026, month - 1, 1)).toLocaleString(undefined, {
    month: 'long',
    timeZone: 'UTC',
  });
}

export function money(value: number): string {
  return value.toFixed(2);
}

export function statusColor(status: PaymentStatus): string {
  switch (status) {
    case 'PAID':
      return '#166534';
    case 'PENDING':
      return '#92400e';
    default:
      return '#6b7280';
  }
}

export function labelOf(value: string): string {
  return value.replaceAll('_', ' ');
}
