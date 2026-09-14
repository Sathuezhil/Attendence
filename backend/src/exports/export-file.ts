import { StreamableFile } from '@nestjs/common';

export function attachmentDisposition(fileName: string): string {
  const sanitized = fileName.replaceAll(/["\r\n\\]/g, '_');
  return `attachment; filename="${sanitized}"`;
}

export function toDownload(
  body: Buffer,
  fileName: string,
  mimeType: string,
): StreamableFile {
  return new StreamableFile(body, {
    type: mimeType,
    disposition: attachmentDisposition(fileName),
  });
}
