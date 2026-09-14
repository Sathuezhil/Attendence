export const MONEY_SCALE = 100;

export function toCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Monetary value must be a finite number');
  }

  return Math.round(value * MONEY_SCALE);
}

export function fromCents(cents: number): number {
  return cents / MONEY_SCALE;
}

export function toMoney(value: unknown): number {
  return Number(value);
}
