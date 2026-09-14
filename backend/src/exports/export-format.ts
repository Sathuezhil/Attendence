import { toDateOnly } from '../attendance/working-hours';

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return toDateOnly(value);
}

export function formatDateTime(value = new Date()): string {
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function formatTime(value: Date | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.toISOString().slice(11, 16);
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function present(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value);
}

export function fileStem(title: string, at = new Date()): string {
  const slug = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return `${slug}-${toDateOnly(at)}`;
}

export function listedFilters(
  entries: Array<[string, unknown]>,
): Array<{ label: string; value: string }> {
  return entries
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    )
    .map(([label, value]) => ({ label, value: String(value) }));
}

export function periodLabel(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function safeFileName(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]+/g, '_');
}
