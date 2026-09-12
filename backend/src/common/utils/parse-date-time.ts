import { BadRequestException } from '@nestjs/common';

export function parseOptionalDateTime(
  value: string | undefined,
  fieldName: string,
  fallbackDate?: Date,
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed) && fallbackDate) {
    const [hours, minutes] = trimmed.split(':').map(Number);
    return new Date(
      Date.UTC(
        fallbackDate.getUTCFullYear(),
        fallbackDate.getUTCMonth(),
        fallbackDate.getUTCDate(),
        hours,
        minutes,
        0,
        0,
      ),
    );
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date-time`);
  }

  return parsed;
}
