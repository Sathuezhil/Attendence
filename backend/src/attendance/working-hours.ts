import { AttendanceStatus } from '@prisma/client';

export interface WorkingHours {
  start: string;
  end: string;
  lateThresholdMinutes: number;
  halfDayMinutes: number;
  timezone: string;
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  start: '09:00',
  end: '18:00',
  lateThresholdMinutes: 15,
  halfDayMinutes: 240,
  timezone: 'UTC',
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface AttendanceMetrics {
  lateMinutes: number;
  workingMinutes: number | null;
  status: AttendanceStatus;
}

export function parseWorkingHours(value: unknown): WorkingHours {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_WORKING_HOURS };
  }

  const input = value as Record<string, unknown>;
  const start =
    typeof input.start === 'string' && TIME_PATTERN.test(input.start)
      ? input.start
      : DEFAULT_WORKING_HOURS.start;
  const end =
    typeof input.end === 'string' && TIME_PATTERN.test(input.end)
      ? input.end
      : DEFAULT_WORKING_HOURS.end;
  const lateThresholdMinutes = positiveInt(
    input.lateThresholdMinutes,
    DEFAULT_WORKING_HOURS.lateThresholdMinutes,
  );
  const halfDayMinutes = positiveInt(
    input.halfDayMinutes,
    DEFAULT_WORKING_HOURS.halfDayMinutes,
  );
  const timezone =
    typeof input.timezone === 'string' && input.timezone.trim().length > 0
      ? input.timezone.trim()
      : DEFAULT_WORKING_HOURS.timezone;

  return {
    start,
    end,
    lateThresholdMinutes,
    halfDayMinutes,
    timezone,
  };
}

export function calendarDate(timezone = DEFAULT_WORKING_HOURS.timezone): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return utcDate(year, month, day);
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function calculateAttendanceMetrics(
  checkIn: Date | null | undefined,
  checkOut: Date | null | undefined,
  attendanceDate: Date,
  hours: WorkingHours,
): AttendanceMetrics {
  if (!checkIn) {
    return {
      lateMinutes: 0,
      workingMinutes: null,
      status: AttendanceStatus.ABSENT,
    };
  }

  const start = timeOnDate(attendanceDate, hours.start);
  const minutesAfterStart = Math.round(
    (checkIn.getTime() - start.getTime()) / 60_000,
  );
  const lateMinutes = Math.max(0, minutesAfterStart);
  const workingMinutes = checkOut ? durationMinutes(checkIn, checkOut) : null;

  return {
    lateMinutes,
    workingMinutes,
    status: deriveStatus(lateMinutes, workingMinutes, hours),
  };
}

export function deriveStatus(
  lateMinutes: number,
  workingMinutes: number | null,
  hours: WorkingHours,
): AttendanceStatus {
  if (workingMinutes !== null && workingMinutes < hours.halfDayMinutes) {
    return AttendanceStatus.HALF_DAY;
  }

  if (lateMinutes > hours.lateThresholdMinutes) {
    return AttendanceStatus.LATE;
  }

  return AttendanceStatus.PRESENT;
}

function durationMinutes(checkIn: Date, checkOut: Date): number {
  let out = checkOut.getTime();
  if (out <= checkIn.getTime()) {
    out += 24 * 60 * 60 * 1000;
  }

  return Math.max(0, Math.round((out - checkIn.getTime()) / 60_000));
}

function timeOnDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
      0,
      0,
    ),
  );
}

function positiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}
