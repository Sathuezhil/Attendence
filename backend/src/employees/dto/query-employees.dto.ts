import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const optionalTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class QueryEmployeesDto {
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

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  search?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'])
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE';

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  jobTitle?: string;
}
