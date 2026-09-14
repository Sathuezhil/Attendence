import { Prisma } from '@prisma/client';
import { ModelConfig } from './firestore-models';

type TimestampLike = { toDate: () => Date };

function isTimestamp(value: unknown): value is TimestampLike {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as TimestampLike).toDate === 'function'
  );
}

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return (
    value instanceof Prisma.Decimal ||
    (!!value &&
      typeof value === 'object' &&
      typeof (value as { toNumber?: unknown }).toNumber === 'function' &&
      typeof (value as { d?: unknown }).d !== 'undefined')
  );
}

export function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toMillis(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return parseDateOnly(value).getTime();
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (isTimestamp(value)) {
    return value.toDate().getTime();
  }
  return null;
}

export function toNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (isDecimalLike(value)) {
    return value.toNumber();
  }
  return null;
}

export function stripUndefined<T extends Record<string, unknown>>(
  input: T,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
}

export function serializeForWrite(
  data: Record<string, unknown>,
  config: ModelConfig,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      output[key] = null;
      continue;
    }
    if (config.dateOnlyFields.includes(key)) {
      const millis = toMillis(value);
      output[key] = millis == null ? null : toDateOnlyString(new Date(millis));
      continue;
    }
    if (config.dateTimeFields.includes(key)) {
      const millis = toMillis(value);
      output[key] = millis == null ? null : new Date(millis).toISOString();
      continue;
    }
    if (config.decimalFields.includes(key)) {
      output[key] = toNumber(value);
      continue;
    }
    if (isDecimalLike(value)) {
      output[key] = value.toNumber();
      continue;
    }
    output[key] = value;
  }
  return output;
}

export function deserializeRecord(
  data: Record<string, unknown>,
  config: ModelConfig,
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...data };
  for (const field of config.dateOnlyFields) {
    const value = output[field];
    if (value == null) {
      output[field] = null;
      continue;
    }
    const millis = toMillis(value);
    output[field] = millis == null ? null : new Date(millis);
  }
  for (const field of config.dateTimeFields) {
    const value = output[field];
    if (value == null) {
      output[field] = null;
      continue;
    }
    const millis = toMillis(value);
    output[field] = millis == null ? null : new Date(millis);
  }
  for (const field of config.decimalFields) {
    const value = output[field];
    if (value == null) {
      output[field] = null;
      continue;
    }
    const numeric = toNumber(value);
    output[field] = numeric == null ? null : new Prisma.Decimal(numeric);
  }
  return output;
}

export function pickSelected<T extends Record<string, unknown>>(
  record: T,
  select: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!select) {
    return record;
  }
  const output: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(select)) {
    if (spec === true) {
      output[key] = record[key];
    } else if (spec && typeof spec === 'object') {
      const nested = record[key];
      const nestedSelect = (spec as { select?: Record<string, unknown> })
        .select;
      if (Array.isArray(nested)) {
        output[key] = nested.map((item) =>
          pickSelected(item as Record<string, unknown>, nestedSelect ?? {}),
        );
      } else if (nested && typeof nested === 'object') {
        output[key] = pickSelected(
          nested as Record<string, unknown>,
          nestedSelect ?? (spec as Record<string, unknown>),
        );
      } else {
        output[key] = nested;
      }
    }
  }
  return output;
}
