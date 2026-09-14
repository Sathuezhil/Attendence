import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PAYMENT_STATUSES } from '../../payroll/payroll.types';

export class QueryPayrollReportDto {
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
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsIn([...PAYMENT_STATUSES])
  paymentStatus?: (typeof PAYMENT_STATUSES)[number];
}
