import { Transform, Type } from 'class-transformer';
import {
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

export class QueryTodayAttendanceDto {
  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([...PUBLIC_ATTENDANCE_STATUSES])
  status?: (typeof PUBLIC_ATTENDANCE_STATUSES)[number];

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
  limit?: number = 50;
}
