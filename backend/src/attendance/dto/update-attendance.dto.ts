import { AttendanceStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const optionalTrim = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export class UpdateAttendanceDto {
  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  checkIn?: string;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @IsIn(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'], {
    message: 'status must be PRESENT, ABSENT, LATE, HALF_DAY or ON_LEAVE',
  })
  status?: Exclude<
    AttendanceStatus,
    typeof AttendanceStatus.LEAVE | typeof AttendanceStatus.HOLIDAY
  >;

  @Transform(optionalTrim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
