import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PUBLIC_DOCUMENT_TYPES } from '../../documents/documents.types';

export class QueryDocumentReportDto {
  @IsOptional()
  @IsIn([...PUBLIC_DOCUMENT_TYPES])
  documentType?: (typeof PUBLIC_DOCUMENT_TYPES)[number];

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  expiryFrom?: string;

  @IsOptional()
  @IsDateString()
  expiryTo?: string;
}
