import {
  calculateExpiryAlert,
  calculateExpiryStatus,
  DEFAULT_DOCUMENT_URGENT_DAYS,
  DEFAULT_DOCUMENT_WARNING_DAYS,
  normalizeExpiryThresholds,
  resolveWarningDays,
} from './document-expiry';

describe('document expiry', () => {
  const today = new Date('2026-09-12T00:00:00.000Z');

  it('uses a 30-day default warning window', () => {
    expect(DEFAULT_DOCUMENT_WARNING_DAYS).toBe(30);
    expect(resolveWarningDays(undefined, 30)).toBe(30);
    expect(resolveWarningDays({ days: 45 }, 30)).toBe(45);
  });

  it('marks a past date as expired', () => {
    expect(
      calculateExpiryStatus(new Date('2026-09-01T00:00:00.000Z'), today, 30),
    ).toBe('EXPIRED');
  });

  it('marks a date inside the warning window as expiring soon', () => {
    expect(
      calculateExpiryStatus(new Date('2026-09-20T00:00:00.000Z'), today, 30),
    ).toBe('EXPIRING_SOON');
  });

  it('marks a later date as valid', () => {
    expect(
      calculateExpiryStatus(new Date('2026-12-01T00:00:00.000Z'), today, 30),
    ).toBe('VALID');
  });

  it('uses configurable 30-day and 7-day alert thresholds', () => {
    expect(DEFAULT_DOCUMENT_URGENT_DAYS).toBe(7);
    const thresholds = normalizeExpiryThresholds(30, 7);
    expect(
      calculateExpiryAlert(
        new Date('2026-10-12T00:00:00.000Z'),
        today,
        thresholds,
      ),
    ).toBe('EXPIRING_SOON');
    expect(
      calculateExpiryAlert(
        new Date('2026-09-19T00:00:00.000Z'),
        today,
        thresholds,
      ),
    ).toBe('URGENT_EXPIRY');
    expect(
      calculateExpiryAlert(
        new Date('2026-09-01T00:00:00.000Z'),
        today,
        thresholds,
      ),
    ).toBe('EXPIRED');
  });
});
