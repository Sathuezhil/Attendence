import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

const employee = {
  id: '11111111-1111-1111-1111-111111111111',
  employeeCode: 'EMP-001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  status: 'ACTIVE',
  deletedAt: null,
};

const pdf = {
  originalname: 'passport.pdf',
  mimetype: 'application/octet-stream',
  size: 12,
  buffer: Buffer.from('%PDF-1.4 test', 'ascii'),
};

describe('DocumentsService', () => {
  const prisma = {
    employee: { findFirst: jest.fn() },
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appSetting: { findUnique: jest.fn() },
  };
  const storage = {
    driver: 'local' as const,
    upload: jest.fn(),
    read: jest.fn(),
    delete: jest.fn(),
    getSignedDownloadUrl: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'upload') {
        return {
          maxFileSizeBytes: 10 * 1024 * 1024,
          allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        };
      }
      if (key === 'documentExpiryWarningDays') {
        return 30;
      }
      return undefined;
    }),
  };

  let service: DocumentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appSetting.findUnique.mockResolvedValue(null);
    const expiry = {
      runDailyCheck: jest.fn().mockResolvedValue({ created: 0, examined: 0 }),
    };
    service = new DocumentsService(
      prisma as never,
      storage,
      config as never,
      expiry as never,
    );
  });

  it('creates a document after validating magic bytes', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);
    storage.upload.mockResolvedValue({ key: 'documents/x.pdf' });
    prisma.document.create.mockResolvedValue({
      id: 'doc-1',
      employeeId: employee.id,
      documentType: 'PASSPORT',
      documentNumber: 'A1234567',
      issueDate: null,
      expiryDate: new Date('2027-01-01T00:00:00.000Z'),
      fileName: 'passport.pdf',
      fileUrl: 'documents/emp/file.pdf',
      mimeType: 'application/pdf',
      fileSize: 12,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      employee,
    });

    const result = await service.create(
      employee.id,
      { documentType: 'PASSPORT', documentNumber: 'A1234567' },
      pdf,
    );

    expect(result.documentType).toBe('PASSPORT');
    expect(result.documentNumberMasked).toContain('*');
    expect(storage.upload).toHaveBeenCalledTimes(1);
    const uploaded = storage.upload.mock.calls[0][0] as { key: string };
    expect(uploaded.key.startsWith(`documents/${employee.id}/`)).toBe(true);
    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fileUrl: uploaded.key,
          mimeType: 'application/pdf',
          fileName: 'passport.pdf',
        }),
      }),
    );
  });

  it('rejects an unsupported file without writing storage', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);

    await expect(
      service.create(
        employee.id,
        { documentType: 'OTHER' },
        {
          originalname: 'notes.txt',
          mimetype: 'text/plain',
          size: 5,
          buffer: Buffer.from('hello'),
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects a missing employee', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(
      service.create(employee.id, { documentType: 'OTHER' }, pdf),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes the stored file and the metadata row', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 'doc-1',
      fileUrl: 'documents/emp/file.pdf',
      employee,
    });
    prisma.document.delete.mockResolvedValue({});

    await expect(service.remove('doc-1')).resolves.toEqual({ success: true });
    expect(storage.delete).toHaveBeenCalledWith('documents/emp/file.pdf');
  });

  it('rejects an oversized file before storage', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);

    await expect(
      service.create(
        employee.id,
        { documentType: 'OTHER' },
        {
          ...pdf,
          size: 20 * 1024 * 1024,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('filters expired documents on the server and paginates', async () => {
    prisma.document.count.mockResolvedValue(0);
    prisma.document.findMany.mockResolvedValue([]);

    await service.list({
      expiryStatus: 'EXPIRED',
      search: 'Ada',
      page: 2,
      limit: 20,
    });

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      }),
    );
    const call = prisma.document.findMany.mock.calls[0][0] as {
      where: { AND: unknown[]; employee: { OR: unknown[] } };
    };
    expect(call.where.AND).toHaveLength(1);
    expect(call.where.employee.OR).toHaveLength(3);
  });

  it('counts expired and expiring-soon documents from live data', async () => {
    prisma.document.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

    await expect(service.getExpirySummary()).resolves.toEqual({
      expired: 2,
      expiringSoon: 3,
      warningDays: 30,
    });
  });
});
