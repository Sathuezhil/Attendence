import { AttendanceStatus } from './types';

export const attendanceStatuses: AttendanceStatus[] = [
  'PRESENT',
  'ON_LEAVE',
  'HALF_DAY',
  'HOLIDAY',
];

export type DayMark = 'ACTIVE' | 'LEAVE' | 'HALF_DAY' | 'OFF_DAY';

export const dayMarks: Array<{ id: DayMark; label: string; status: AttendanceStatus }> = [
  { id: 'ACTIVE', label: 'Active', status: 'PRESENT' },
  { id: 'LEAVE', label: 'Leave', status: 'ON_LEAVE' },
  { id: 'HALF_DAY', label: 'Half day', status: 'HALF_DAY' },
  { id: 'OFF_DAY', label: 'Off day', status: 'HOLIDAY' },
];

export function dayMarkFromStatus(status: string | undefined): DayMark | null {
  switch (status) {
    case 'PRESENT':
    case 'LATE':
      return 'ACTIVE';
    case 'ON_LEAVE':
    case 'ABSENT':
      return 'LEAVE';
    case 'HALF_DAY':
      return 'HALF_DAY';
    case 'HOLIDAY':
      return 'OFF_DAY';
    default:
      return null;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'PRESENT':
    case 'LATE':
      return 'Active';
    case 'ABSENT':
    case 'ON_LEAVE':
      return 'Leave';
    case 'HALF_DAY':
      return 'Half day';
    case 'HOLIDAY':
      return 'Off day';
    default:
      return status.replaceAll('_', ' ');
  }
}

export function statusColor(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT':
    case 'LATE':
      return '#166534';
    case 'HALF_DAY':
      return '#1e40af';
    case 'ON_LEAVE':
    case 'ABSENT':
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
