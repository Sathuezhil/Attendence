import { AttendanceStatus } from '@prisma/client';
import {
  DEFAULT_WORKING_HOURS,
  calculateAttendanceMetrics,
  deriveStatus,
  parseWorkingHours,
  utcDate,
} from './working-hours';

describe('working hours', () => {
  const date = utcDate(2026, 9, 12);

  it('uses development defaults when settings are missing', () => {
    expect(parseWorkingHours(null)).toEqual(DEFAULT_WORKING_HOURS);
    expect(DEFAULT_WORKING_HOURS.start).toBe('09:00');
    expect(DEFAULT_WORKING_HOURS.end).toBe('18:00');
    expect(DEFAULT_WORKING_HOURS.lateThresholdMinutes).toBe(15);
  });

  it('treats check-in within the late threshold as present', () => {
    const checkIn = new Date('2026-09-12T09:10:00.000Z');
    const result = calculateAttendanceMetrics(
      checkIn,
      null,
      date,
      DEFAULT_WORKING_HOURS,
    );

    expect(result.lateMinutes).toBe(10);
    expect(result.workingMinutes).toBeNull();
    expect(result.status).toBe(AttendanceStatus.PRESENT);
  });

  it('marks a late check-in after the threshold', () => {
    const checkIn = new Date('2026-09-12T09:20:00.000Z');
    const result = calculateAttendanceMetrics(
      checkIn,
      null,
      date,
      DEFAULT_WORKING_HOURS,
    );

    expect(result.lateMinutes).toBe(20);
    expect(result.status).toBe(AttendanceStatus.LATE);
  });

  it('calculates working minutes from check-out', () => {
    const checkIn = new Date('2026-09-12T09:00:00.000Z');
    const checkOut = new Date('2026-09-12T18:00:00.000Z');
    const result = calculateAttendanceMetrics(
      checkIn,
      checkOut,
      date,
      DEFAULT_WORKING_HOURS,
    );

    expect(result.workingMinutes).toBe(540);
    expect(result.status).toBe(AttendanceStatus.PRESENT);
  });

  it('marks a short shift as half-day', () => {
    expect(deriveStatus(0, 180, DEFAULT_WORKING_HOURS)).toBe(
      AttendanceStatus.HALF_DAY,
    );
  });

  it('adds 24 hours when check-out is before check-in', () => {
    const checkIn = new Date('2026-09-12T22:00:00.000Z');
    const checkOut = new Date('2026-09-12T06:00:00.000Z');
    const result = calculateAttendanceMetrics(
      checkIn,
      checkOut,
      date,
      DEFAULT_WORKING_HOURS,
    );

    expect(result.workingMinutes).toBe(480);
  });
});
