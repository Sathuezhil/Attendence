import type { StringValue } from 'ms';

export interface AppConfiguration {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: StringValue;
    refreshSecret: string;
    refreshExpiresIn: StringValue;
  };
  upload: {
    maxFileSizeBytes: number;
    allowedMimeTypes: string[];
  };
  storage: {
    endpoint?: string;
    region?: string;
    bucket?: string;
    backupBucket?: string;
    accessKey?: string;
    secretKey?: string;
    localDir: string;
  };
  documentExpiryWarningDays: number;
  documentExpiryUrgentDays: number;
  documentExpiryCron: string;
  documentExpiryTimezone: string;
  documentExpiryCheckOnBoot: boolean;
  payrollWorkingDaysPerMonth: number;
  invoiceNumberPrefix: string;
  invoiceOverdueCron: string;
  invoiceOverdueTimezone: string;
  invoiceOverdueCheckOnBoot: boolean;
  company: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export default (): AppConfiguration => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigins: (process.env.CORS_ORIGIN ?? '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ??
      '15m') as StringValue,
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ??
      '7d') as StringValue,
  },
  upload: {
    maxFileSizeBytes: Number(
      process.env.MAX_UPLOAD_SIZE_BYTES ?? 10 * 1024 * 1024,
    ),
    allowedMimeTypes: (
      process.env.ALLOWED_UPLOAD_MIME_TYPES ??
      'application/pdf,image/jpeg,image/png'
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    backupBucket: process.env.S3_BACKUP_BUCKET,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    localDir: process.env.STORAGE_LOCAL_DIR ?? 'storage',
  },
  documentExpiryWarningDays: Number(
    process.env.DOCUMENT_EXPIRY_WARNING_DAYS ?? 30,
  ),
  documentExpiryUrgentDays: Number(
    process.env.DOCUMENT_EXPIRY_URGENT_DAYS ?? 7,
  ),
  documentExpiryCron: process.env.DOCUMENT_EXPIRY_CRON ?? '0 7 * * *',
  documentExpiryTimezone: process.env.DOCUMENT_EXPIRY_TIMEZONE ?? 'UTC',
  documentExpiryCheckOnBoot:
    (process.env.DOCUMENT_EXPIRY_CHECK_ON_BOOT ?? 'true') === 'true',
  payrollWorkingDaysPerMonth: Number(
    process.env.PAYROLL_WORKING_DAYS_PER_MONTH ?? 26,
  ),
  invoiceNumberPrefix: process.env.INVOICE_NUMBER_PREFIX ?? 'INV',
  invoiceOverdueCron: process.env.INVOICE_OVERDUE_CRON ?? '0 8 * * *',
  invoiceOverdueTimezone: process.env.INVOICE_OVERDUE_TIMEZONE ?? 'UTC',
  invoiceOverdueCheckOnBoot:
    (process.env.INVOICE_OVERDUE_CHECK_ON_BOOT ?? 'true') === 'true',
  company: {
    name: process.env.COMPANY_NAME,
    email: process.env.COMPANY_EMAIL,
    phone: process.env.COMPANY_PHONE,
    address: process.env.COMPANY_ADDRESS,
  },
});
