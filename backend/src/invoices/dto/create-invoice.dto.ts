import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { InvoiceItemDto } from './invoice-item.dto';

const optionalTrim = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export class CreateInvoiceDto {
  @Transform(optionalTrim)
  @IsString()
  @MaxLength(120)
  customerName!: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  customerEmail?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(400)
  customerAddress?: string;

  @IsDateString()
  invoiceDate!: string;

  @IsDateString()
  dueDate!: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  taxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  discountAmount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}
