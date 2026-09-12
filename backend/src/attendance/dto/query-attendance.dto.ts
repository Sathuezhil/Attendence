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
  @IsIn(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'])
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  department?: string;
}
