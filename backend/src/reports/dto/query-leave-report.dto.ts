import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const REPORT_LEAVE_TYPES = [
  'ANNUAL',
  'SICK',
  'UNPAID',
  'EMERGENCY',
  'OTHER',
] as const;

export const REPORT_LEAVE_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export class QueryLeaveReportDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsIn([...REPORT_LEAVE_TYPES])
  leaveType?: (typeof REPORT_LEAVE_TYPES)[number];

  @IsOptional()
  @IsIn([...REPORT_LEAVE_STATUSES])
  status?: (typeof REPORT_LEAVE_STATUSES)[number];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
