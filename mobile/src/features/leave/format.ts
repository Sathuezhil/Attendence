import { LeaveStatus, LeaveType } from './types';

export const leaveStatuses: LeaveStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

export const leaveTypes: LeaveType[] = [
  'ANNUAL',
  'SICK',
  'UNPAID',
  'EMERGENCY',
  'OTHER',
];

export function labelOf(value: string): string {
  return value.replaceAll('_', ' ');
}

export function statusColor(status: LeaveStatus): string {
  switch (status) {
    case 'APPROVED':
      return '#166534';
    case 'PENDING':
      return '#92400e';
    case 'REJECTED':
      return '#991b1b';
    default:
      return '#374151';
  }
}

export function calculateDisplayDays(startDate: string, endDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return null;
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
