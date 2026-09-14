import { toMoney } from '../invoices/invoice-money';

export function roundMoney(value: unknown): number {
  return Math.round((toMoney(value) + Number.EPSILON) * 100) / 100;
}

export function roundPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function minutesToHours(minutes: number): number {
  return roundMoney(minutes / 60);
}

export function attendancePercentage(input: {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  onLeave: number;
}): number {
  const recorded =
    input.present + input.late + input.halfDay + input.absent + input.onLeave;
  if (recorded <= 0) {
    return 0;
  }

  const attended = input.present + input.late + input.halfDay * 0.5;
  return roundPercent((attended / recorded) * 100);
}

export function countByKey<T extends string>(
  rows: Array<{ key: T; count: number }>,
  keys: readonly T[],
): Record<T, number> {
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
    T,
    number
  >;

  for (const row of rows) {
    if (row.key in result) {
      result[row.key] += row.count;
    }
  }

  return result;
}
