import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class CompanySettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  vatNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  logoUrl?: string;
}

class WorkingHoursSettingsDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  breakDurationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  lateThresholdMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(720)
  halfDayMinutes?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  workingDays?: number[];
}

class LeavePolicyDto {
  @IsOptional()
  @IsObject()
  limits?: Record<string, number>;
}

class PayrollSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  workingDaysPerMonth?: number;

  @IsOptional()
  @IsBoolean()
  overtimeEnabled?: boolean;
}

class NotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  documentExpiry?: boolean;

  @IsOptional()
  @IsBoolean()
  leave?: boolean;

  @IsOptional()
  @IsBoolean()
  attendance?: boolean;

  @IsOptional()
  @IsBoolean()
  payroll?: boolean;

  @IsOptional()
  @IsBoolean()
  invoices?: boolean;
}

class DocumentSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiryWarningDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  expiryUrgentDays?: number;
}

export class UpdateSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanySettingsDto)
  company?: CompanySettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursSettingsDto)
  workingHours?: WorkingHoursSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LeavePolicyDto)
  leave?: LeavePolicyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollSettingsDto)
  payroll?: PayrollSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentSettingsDto)
  documents?: DocumentSettingsDto;
}
