import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PUBLIC_DOCUMENT_TYPES } from '../documents.types';

const optionalTrim = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export class UpdateDocumentDto {
  @IsOptional()
  @IsIn([...PUBLIC_DOCUMENT_TYPES])
  documentType?: (typeof PUBLIC_DOCUMENT_TYPES)[number];

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  documentNumber?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
