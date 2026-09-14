import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PUBLIC_INVOICE_STATUSES } from '../../invoices/invoices.types';

export class QueryInvoiceReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn([...PUBLIC_INVOICE_STATUSES])
  status?: (typeof PUBLIC_INVOICE_STATUSES)[number];
}
