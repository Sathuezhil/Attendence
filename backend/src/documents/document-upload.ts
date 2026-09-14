import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export function documentFileInterceptor() {
  return FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      fileSize: Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? DEFAULT_MAX_BYTES),
    },
  });
}

export function safeContentDisposition(fileName: string): string {
  const sanitized = fileName.replaceAll(/["\r\n]/g, '_');
  return `inline; filename="${sanitized}"`;
}
