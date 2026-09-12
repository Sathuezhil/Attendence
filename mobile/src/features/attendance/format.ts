import { AttendanceStatus } from './types';

export const attendanceStatuses: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'ON_LEAVE',
];

export function statusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export function statusColor(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT':
      return '#166534';
    case 'LATE':
      return '#92400e';
    case 'HALF_DAY':
      return '#1e40af';
    case 'ON_LEAVE':
      return '#6d28d9';
    case 'HOLIDAY':
      return '#374151';
    default:
      return '#991b1b';
  }
}

export function formatTime(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) {
    return '—';
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) {
    return `${remaining}m`;
  }

  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
}

export function todayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}
