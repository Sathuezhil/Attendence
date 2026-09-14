import { BadRequestException } from '@nestjs/common';
import { parseOptionalDate } from '../common/utils/parse-date';
import { toDateOnly } from '../attendance/working-hours';

export const MAX_REPORT_RANGE_DAYS = 731;

export interface ReportPeriod {
  startDate: string;
  endDate: string;
}

export function todayUtcDate(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function startOfUtcMonth(date = todayUtcDate()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function resolveReportPeriod(
  start?: string,
  end?: string,
): { start: Date; end: Date; period: ReportPeriod } {
  const today = todayUtcDate();
  const startDate =
    parseOptionalDate(start, 'startDate') ?? startOfUtcMonth(today);
  const endDate = parseOptionalDate(end, 'endDate') ?? today;

  if (!startDate || !endDate) {
    throw new BadRequestException('startDate and endDate must be valid dates');
  }

  if (toDateOnly(endDate) < toDateOnly(startDate)) {
    throw new BadRequestException('endDate cannot be before startDate');
  }

  const days =
    Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (days > MAX_REPORT_RANGE_DAYS) {
    throw new BadRequestException(
      `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`,
    );
  }

  return {
    start: startDate,
    end: endDate,
    period: {
      startDate: toDateOnly(startDate),
      endDate: toDateOnly(endDate),
    },
  };
}
