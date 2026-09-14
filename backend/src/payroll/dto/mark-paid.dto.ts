import { IsDateString, IsOptional } from 'class-validator';

export class MarkPaidDto {
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}
