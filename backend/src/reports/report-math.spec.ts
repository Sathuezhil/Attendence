import {
  attendancePercentage,
  minutesToHours,
  roundMoney,
} from './report-math';
import { MAX_REPORT_RANGE_DAYS, resolveReportPeriod } from './report-period';

describe('report math', () => {
  it('returns 0% when no attendance rows exist', () => {
    expect(
      attendancePercentage({
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        onLeave: 0,
      }),
    ).toBe(0);
  });

  it('counts half-days as half a present day', () => {
    expect(
      attendancePercentage({
        present: 2,
        late: 0,
        halfDay: 2,
        absent: 0,
        onLeave: 0,
      }),
    ).toBe(75);
  });

  it('converts minutes to hours with money rounding', () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(roundMoney(10.105)).toBe(10.11);
  });
});

describe('report period', () => {
  it('rejects an inverted date range', () => {
    expect(() => resolveReportPeriod('2026-09-30', '2026-09-01')).toThrow(
      'endDate cannot be before startDate',
    );
  });

  it('rejects ranges larger than the configured limit', () => {
    expect(() => resolveReportPeriod('2020-01-01', '2026-09-14')).toThrow(
      `${MAX_REPORT_RANGE_DAYS} days`,
    );
  });
});
