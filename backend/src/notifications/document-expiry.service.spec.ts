import { DocumentExpiryService } from './document-expiry.service';

jest.mock('../attendance/working-hours', () => {
  const actual: typeof import('../attendance/working-hours') =
    jest.requireActual('../attendance/working-hours');
  return {
    ...actual,
    calendarDate: () => new Date('2026-09-12T00:00:00.000Z'),
  };
});

describe('DocumentExpiryService', () => {
  const prisma = {
    appSetting: { findUnique: jest.fn() },
    document: { findMany: jest.fn() },
    notification: { createMany: jest.fn() },
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'documentExpiryWarningDays') return 30;
      if (key === 'documentExpiryUrgentDays') return 7;
      return undefined;
    }),
  };

  let service: DocumentExpiryService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appSetting.findUnique.mockResolvedValue(null);
    service = new DocumentExpiryService(prisma as never, config as never);
  });

  it('creates expiry notifications from date-filtered documents', async () => {
    prisma.document.findMany.mockResolvedValue([
      {
        id: 'doc-x',
        employeeId: 'emp-1',
        documentType: 'PASSPORT',
        expiryDate: new Date('2026-09-01T00:00:00.000Z'),
        employee: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          employeeCode: 'E1',
        },
      },
    ]);
    prisma.notification.createMany.mockResolvedValue({ count: 1 });

    await expect(service.runDailyCheck()).resolves.toEqual({
      created: 1,
      examined: 1,
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it('does not create extra rows when the same check runs again', async () => {
    prisma.document.findMany.mockResolvedValue([
      {
        id: 'doc-x',
        employeeId: 'emp-1',
        documentType: 'PASSPORT',
        expiryDate: new Date('2026-09-01T00:00:00.000Z'),
        employee: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          employeeCode: 'E1',
        },
      },
    ]);
    prisma.notification.createMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await service.runDailyCheck();
    await expect(service.runDailyCheck()).resolves.toEqual({
      created: 0,
      examined: 1,
    });
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(2);
    expect(prisma.notification.createMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(prisma.notification.createMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it('groups dashboard alerts into expired, 7-day, and 30-day buckets', async () => {
    prisma.document.findMany.mockResolvedValue([
      {
        id: 'expired',
        employeeId: 'emp-1',
        documentType: 'PASSPORT',
        expiryDate: new Date('2026-09-01T00:00:00.000Z'),
        employee: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          employeeCode: 'E1',
        },
      },
      {
        id: 'urgent',
        employeeId: 'emp-1',
        documentType: 'VISA',
        expiryDate: new Date('2026-09-19T00:00:00.000Z'),
        employee: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          employeeCode: 'E1',
        },
      },
      {
        id: 'soon',
        employeeId: 'emp-1',
        documentType: 'INSURANCE',
        expiryDate: new Date('2026-10-12T00:00:00.000Z'),
        employee: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          employeeCode: 'E1',
        },
      },
    ]);

    const alerts = await service.getExpiryAlerts();
    expect(alerts.expired.map((item) => item.documentId)).toEqual(['expired']);
    expect(alerts.expiringUrgent.map((item) => item.documentId)).toEqual([
      'urgent',
    ]);
    expect(alerts.expiringSoon.map((item) => item.documentId)).toEqual([
      'soon',
    ]);
    expect(JSON.stringify(alerts)).not.toContain('fileUrl');
  });
});
