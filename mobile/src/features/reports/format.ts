export function labelOf(value: string): string {
  switch (value) {
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
      return value.replaceAll('_', ' ');
  }
}

export function money(value: number): string {
  return value.toFixed(2);
}

export function monthStart(date = new Date()): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).toISOString().slice(0, 10);
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthLabel(month: number): string {
  return new Date(Date.UTC(2026, month - 1, 1)).toLocaleString(undefined, {
    month: 'short',
    timeZone: 'UTC',
  });
}
