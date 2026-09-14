import { ServiceUnavailableException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    employee: { count: jest.fn() },
    auditLog: { findMany: jest.fn() },
  };

  const attendanceService = {
    getWorkingHours: jest.fn(),
    getSummaryCounts: jest.fn(),
  };

  const documentsService = {
    getExpirySummary: jest.fn(),
  };

  const documentExpiryService = {
    getExpiryAlerts: jest.fn(),
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    attendanceService.getWorkingHours.mockResolvedValue({
      start: '09:00',
      end: '18:00',
      lateThresholdMinutes: 15,
      halfDayMinutes: 240,
      timezone: 'UTC',
    });
    documentsService.getExpirySummary.mockResolvedValue({
      expired: 1,
      expiringSoon: 2,
      warningDays: 30,
    });
    documentExpiryService.getExpiryAlerts.mockResolvedValue({
      expired: [],
      expiringUrgent: [],
      expiringSoon: [],
      urgentDays: 7,
      warningDays: 30,
    });
    service = new DashboardService(
      prisma as never,
      attendanceService as never,
      documentsService as never,
      documentExpiryService as never,
    );
  });

  it('returns live employee and attendance counts', async () => {
    prisma.employee.count.mockResolvedValueOnce(4);
    attendanceService.getSummaryCounts.mockResolvedValue({
      date: '2026-09-12',
      totalEmployees: 3,
      present: 2,
      absent: 1,
      late: 0,
      halfDay: 0,
      onLeave: 1,
    });

    await expect(service.getSummary()).resolves.toEqual({
      employees: 4,
      activeEmployees: 3,
      presentToday: 2,
      absentToday: 1,
      onLeaveToday: 1,
      lateToday: 0,
      documentsExpired: 1,
      documentsExpiringSoon: 2,
    });

    expect(prisma.employee.count).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
    expect(attendanceService.getSummaryCounts).toHaveBeenCalledTimes(1);
    expect(documentsService.getExpirySummary).toHaveBeenCalledTimes(1);
  });

  it('returns an empty activity list when no audit rows exist', async () => {
    prisma.auditLog.findMany.mockResolvedValue([]);

    await expect(service.getRecentActivity()).resolves.toEqual({
      activities: [],
    });
  });

  it('maps audit rows without exposing extra fields', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'act-1',
        action: 'LOGIN',
        entityType: 'User',
        createdAt: new Date('2026-09-12T07:00:00.000Z'),
        metadata: { passwordHash: 'secret' },
      },
    ]);

    const result = await service.getRecentActivity();

    expect(result.activities).toEqual([
      {
        id: 'act-1',
        type: 'LOGIN',
        description: 'LOGIN · User',
        occurredAt: '2026-09-12T07:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('throws when the database is unavailable', async () => {
    prisma.employee.count.mockRejectedValue(new Error('connection refused'));

    await expect(service.getSummary()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
