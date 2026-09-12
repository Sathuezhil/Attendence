import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

const optionalTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CheckInDto {
  @IsUUID()
  employeeId!: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  checkIn?: string;
}
