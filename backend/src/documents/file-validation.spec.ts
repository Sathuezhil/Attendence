import { BadRequestException } from '@nestjs/common';
import { assertFileSize, detectFileType } from './file-validation';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

describe('file validation', () => {
  it('accepts a PDF from magic bytes', () => {
    const pdf = Buffer.from('%PDF-1.4 sample', 'ascii');
    expect(detectFileType(pdf, 'offer.pdf', ALLOWED).mimeType).toBe(
      'application/pdf',
    );
  });

  it('accepts a JPEG from magic bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(detectFileType(jpeg, 'scan.jpg', ALLOWED).mimeType).toBe(
      'image/jpeg',
    );
  });

  it('accepts a PNG from magic bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectFileType(png, 'id.png', ALLOWED).mimeType).toBe('image/png');
  });

  it('rejects a Windows executable', () => {
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);
    expect(() => detectFileType(exe, 'setup.exe', ALLOWED)).toThrow(
      BadRequestException,
    );
  });

  it('rejects an oversized file', () => {
    expect(() => assertFileSize(20 * 1024 * 1024, 10 * 1024 * 1024)).toThrow(
      BadRequestException,
    );
  });
});
