import { AttendanceStatus } from '@prisma/client';
import { IsIn, IsUUID } from 'class-validator';

export const MARK_DAY_STATUSES = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.HALF_DAY,
  AttendanceStatus.ON_LEAVE,
  AttendanceStatus.HOLIDAY,
] as const;

export type MarkDayStatus = (typeof MARK_DAY_STATUSES)[number];

export class MarkDayDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(MARK_DAY_STATUSES, {
    message:
      'status must be PRESENT, ABSENT, HALF_DAY, ON_LEAVE or HOLIDAY',
  })
  status!: MarkDayStatus;
}
