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
  Min,
} from 'class-validator';
import { PUBLIC_DOCUMENT_TYPES } from '../documents.types';

export class QueryDocumentsDto {
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

  @IsOptional()
  @IsIn([...PUBLIC_DOCUMENT_TYPES])
  documentType?: (typeof PUBLIC_DOCUMENT_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  expiringWithin?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true' || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === '0') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  expired?: boolean;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['VALID', 'EXPIRING_SOON', 'EXPIRED'])
  expiryStatus?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

  @IsOptional()
  @IsDateString()
  expiryFrom?: string;

  @IsOptional()
  @IsDateString()
  expiryTo?: string;
}
