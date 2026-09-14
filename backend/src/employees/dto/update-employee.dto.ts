import { Gender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const optionalTrim = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalLowerTrim = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 ? undefined : trimmed;
};

export class UpdateEmployeeDto {
  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  employeeCode?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @Transform(optionalLowerTrim)
  @IsOptional()
  @IsEmail()
  email?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @Matches(/^\+?[0-9\s()-]{7,20}$/, {
    message: 'phone must be a valid phone number',
  })
  phone?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @Matches(/^\+?[0-9\s()-]{7,20}$/, {
    message: 'alternatePhone must be a valid phone number',
  })
  alternatePhone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @IsOptional()
  @IsDateString()
  joiningDate?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'], {
    message:
      'employmentStatus must be ACTIVE, INACTIVE, TERMINATED or ON_LEAVE',
  })
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999)
  basicSalary?: number | null;
}
