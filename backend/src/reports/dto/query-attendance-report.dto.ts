import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PUBLIC_ATTENDANCE_STATUSES } from '../../attendance/attendance.types';

export class QueryAttendanceReportDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => String)
  @IsIn([...PUBLIC_ATTENDANCE_STATUSES])
  status?: (typeof PUBLIC_ATTENDANCE_STATUSES)[number];
}
