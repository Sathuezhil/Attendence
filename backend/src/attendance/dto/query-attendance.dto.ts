import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PUBLIC_ATTENDANCE_STATUSES } from '../attendance.types';

const optionalTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class QueryAttendanceDto {
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

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  date?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  startDate?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsIn([...PUBLIC_ATTENDANCE_STATUSES])
  status?: (typeof PUBLIC_ATTENDANCE_STATUSES)[number];

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true' || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === '0') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  lateOnly?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true' || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === '0') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  absentOnly?: boolean;
}
