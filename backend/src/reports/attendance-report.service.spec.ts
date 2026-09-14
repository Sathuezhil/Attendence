import { AttendanceStatus } from '@prisma/client';
import { AttendanceReportService } from './attendance-report.service';

describe('AttendanceReportService', () => {
  const prisma = {
    attendance: { groupBy: jest.fn() },
  };
  const service = new AttendanceReportService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates attendance without loading every row', async () => {
    prisma.attendance.groupBy.mockResolvedValue([
      {
        status: AttendanceStatus.PRESENT,
        _count: { _all: 10 },
        _sum: { workingMinutes: 4800, lateMinutes: 0 },
      },
      {
        status: AttendanceStatus.LATE,
        _count: { _all: 2 },
        _sum: { workingMinutes: 900, lateMinutes: 40 },
      },
      {
        status: AttendanceStatus.ABSENT,
        _count: { _all: 3 },
        _sum: { workingMinutes: 0, lateMinutes: 0 },
      },
      {
        status: AttendanceStatus.LEAVE,
        _count: { _all: 1 },
        _sum: { workingMinutes: 0, lateMinutes: 0 },
      },
    ]);

    const result = await service.getReport({
      startDate: '2026-09-01',
      endDate: '2026-09-14',
    });

    expect(result.present).toBe(12);
    expect(result.late).toBe(0);
    expect(result.absent).toBe(0);
    expect(result.onLeave).toBe(4);
    expect(result.lateMinutes).toBe(40);
    expect(result.totalWorkingHours).toBe(95);
    expect(result.attendancePercentage).toBeGreaterThan(0);
    expect(prisma.attendance.groupBy).toHaveBeenCalledTimes(1);
  });

  it('returns an empty report when no rows match', async () => {
    prisma.attendance.groupBy.mockResolvedValue([]);

    await expect(
      service.getReport({ startDate: '2026-09-01', endDate: '2026-09-14' }),
    ).resolves.toMatchObject({
      present: 0,
      absent: 0,
      attendancePercentage: 0,
      recordedDays: 0,
    });
  });
});
