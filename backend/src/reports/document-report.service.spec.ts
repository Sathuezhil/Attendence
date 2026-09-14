import { DocumentType } from '@prisma/client';
import { DocumentReportService } from './document-report.service';

describe('DocumentReportService', () => {
  const prisma = {
    document: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    appSetting: { findUnique: jest.fn() },
  };
  const config = {
    get: jest.fn().mockReturnValue(30),
  };
  const service = new DocumentReportService(prisma as never, config as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appSetting.findUnique.mockResolvedValue(null);
    prisma.document.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    prisma.document.groupBy
      .mockResolvedValueOnce([
        { documentType: DocumentType.PASSPORT, _count: { _all: 6 } },
        { documentType: DocumentType.VISA, _count: { _all: 4 } },
      ])
      .mockResolvedValueOnce([
        { documentType: DocumentType.PASSPORT, _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([
        { documentType: DocumentType.VISA, _count: { _all: 3 } },
      ]);
  });

  it('counts valid, expiring and expired documents without file numbers', async () => {
    const result = await service.getReport({});

    expect(result.total).toBe(10);
    expect(result.expired).toBe(2);
    expect(result.expiringSoon).toBe(3);
    expect(result.valid).toBe(5);
    expect(JSON.stringify(result)).not.toContain('documentNumber');
    expect(result.byDocumentType).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ documentType: 'PASSPORT', expired: 2 }),
        expect.objectContaining({ documentType: 'VISA', expiringSoon: 3 }),
      ]),
    );
  });
});
