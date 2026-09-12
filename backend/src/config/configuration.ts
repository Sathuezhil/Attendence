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
  },
});
