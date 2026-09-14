import { calculateTotalDays, rangesOverlap } from './leave-days';

describe('leave days', () => {
  it('counts inclusive calendar days', () => {
    expect(
      calculateTotalDays(
        new Date('2026-10-01T00:00:00.000Z'),
        new Date('2026-10-05T00:00:00.000Z'),
      ),
    ).toBe(5);
  });

  it('counts a single-day leave as one day', () => {
    expect(
      calculateTotalDays(
        new Date('2026-10-01T00:00:00.000Z'),
        new Date('2026-10-01T00:00:00.000Z'),
      ),
    ).toBe(1);
  });

  it('detects overlapping ranges', () => {
    expect(
      rangesOverlap(
        new Date('2026-10-01T00:00:00.000Z'),
        new Date('2026-10-05T00:00:00.000Z'),
        new Date('2026-10-03T00:00:00.000Z'),
        new Date('2026-10-07T00:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('allows adjacent non-overlapping ranges', () => {
    expect(
      rangesOverlap(
        new Date('2026-10-01T00:00:00.000Z'),
        new Date('2026-10-05T00:00:00.000Z'),
        new Date('2026-10-06T00:00:00.000Z'),
        new Date('2026-10-07T00:00:00.000Z'),
      ),
    ).toBe(false);
  });
});
