import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

export interface DetectedFile {
  extension: string;
  mimeType: string;
}

const SIGNATURES: Array<{
  mimeType: string;
  extension: string;
  match: (buffer: Buffer) => boolean;
}> = [
  {
    mimeType: 'application/pdf',
    extension: '.pdf',
    match: (buffer) => buffer.subarray(0, 4).toString('ascii') === '%PDF',
  },
  {
    mimeType: 'image/jpeg',
    extension: '.jpg',
    match: (buffer) =>
      buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8,
  },
  {
    mimeType: 'image/png',
    extension: '.png',
    match: (buffer) =>
      buffer.length > 7 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47,
  },
];

export function detectFileType(
  buffer: Buffer,
  originalName: string,
  allowedMimeTypes: string[],
): DetectedFile {
  const detected = SIGNATURES.find((entry) => entry.match(buffer));
  if (!detected || !allowedMimeTypes.includes(detected.mimeType)) {
    throw new BadRequestException(
      'Unsupported file type. Upload a PDF, JPG or PNG.',
    );
  }

  const extension = extname(originalName).toLowerCase();
  const allowedExtensions =
    detected.mimeType === 'application/pdf'
      ? ['.pdf']
      : detected.mimeType === 'image/png'
        ? ['.png']
        : ['.jpg', '.jpeg'];

  if (extension && !allowedExtensions.includes(extension)) {
    throw new BadRequestException(
      'File extension does not match the file contents',
    );
  }

  return {
    extension: allowedExtensions[0],
    mimeType: detected.mimeType,
  };
}

export function assertFileSize(size: number, maxBytes: number): void {
  if (size <= 0) {
    throw new BadRequestException('File is required');
  }

  if (size > maxBytes) {
    throw new BadRequestException(
      `File is too large. Maximum size is ${Math.floor(maxBytes / (1024 * 1024))}MB`,
    );
  }
}

export function safeOriginalName(originalName: string): string {
  const base = originalName.replaceAll(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return base.length > 0 ? base : 'document';
}

export function buildStorageKey(employeeId: string, extension: string): string {
  return `documents/${employeeId}/${randomUUID()}${extension}`;
}
