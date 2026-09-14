import { InvoiceStatus } from './types';

export function money(value: number): string {
  return value.toFixed(2);
}

export function labelOf(value: string): string {
  return value.replaceAll('_', ' ');
}

export function statusColor(status: InvoiceStatus): string {
  switch (status) {
    case 'PAID':
      return '#166534';
    case 'SENT':
      return '#1d4ed8';
    case 'PARTIALLY_PAID':
      return '#7c3aed';
    case 'OVERDUE':
      return '#b91c1c';
    case 'CANCELLED':
      return '#6b7280';
    default:
      return '#92400e';
  }
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
