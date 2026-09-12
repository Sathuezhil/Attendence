import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

const optionalTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CheckOutDto {
  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  checkOut?: string;
}
