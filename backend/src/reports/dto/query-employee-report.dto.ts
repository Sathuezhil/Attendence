import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PUBLIC_EMPLOYMENT_STATUSES } from '../../employees/employees.types';

const optionalTrim = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export class QueryEmployeeReportDto {
  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @IsIn([...PUBLIC_EMPLOYMENT_STATUSES])
  status?: (typeof PUBLIC_EMPLOYMENT_STATUSES)[number];

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  jobTitle?: string;

  @IsOptional()
  @IsDateString()
  joiningFrom?: string;

  @IsOptional()
  @IsDateString()
  joiningTo?: string;
}
