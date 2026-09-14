import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PUBLIC_ATTENDANCE_STATUSES } from '../../attendance/attendance.types';
import { PUBLIC_DOCUMENT_TYPES } from '../../documents/documents.types';
import { PUBLIC_EMPLOYMENT_STATUSES } from '../../employees/employees.types';
import { PUBLIC_INVOICE_STATUSES } from '../../invoices/invoices.types';
import { PAYMENT_STATUSES } from '../../payroll/payroll.types';
import {
  REPORT_LEAVE_STATUSES,
  REPORT_LEAVE_TYPES,
} from '../../reports/dto/query-leave-report.dto';

const optionalTrim = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalBool = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return value;
};

export class QuerySearchDto {
  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;

  @IsOptional()
  @IsIn([...PUBLIC_EMPLOYMENT_STATUSES])
  employeeStatus?: (typeof PUBLIC_EMPLOYMENT_STATUSES)[number];

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
  @IsIn([...PUBLIC_ATTENDANCE_STATUSES])
  attendanceStatus?: (typeof PUBLIC_ATTENDANCE_STATUSES)[number];

  @IsOptional()
  @Transform(optionalBool)
  @IsBoolean()
  lateOnly?: boolean;

  @IsOptional()
  @Transform(optionalBool)
  @IsBoolean()
  absentOnly?: boolean;

  @IsOptional()
  @IsIn([...REPORT_LEAVE_TYPES])
  leaveType?: (typeof REPORT_LEAVE_TYPES)[number];

  @IsOptional()
  @IsIn([...REPORT_LEAVE_STATUSES])
  leaveStatus?: (typeof REPORT_LEAVE_STATUSES)[number];

  @IsOptional()
  @IsIn([...PUBLIC_DOCUMENT_TYPES])
  documentType?: (typeof PUBLIC_DOCUMENT_TYPES)[number];

  @IsOptional()
  @IsIn(['VALID', 'EXPIRING_SOON', 'EXPIRED'])
  expiryStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

  @IsOptional()
  @IsDateString()
  expiryFrom?: string;

  @IsOptional()
  @IsDateString()
  expiryTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsIn([...PAYMENT_STATUSES])
  paymentStatus?: (typeof PAYMENT_STATUSES)[number];

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customer?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  invoiceNumber?: string;

  @IsOptional()
  @IsIn([...PUBLIC_INVOICE_STATUSES])
  invoiceStatus?: (typeof PUBLIC_INVOICE_STATUSES)[number];

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;
}
