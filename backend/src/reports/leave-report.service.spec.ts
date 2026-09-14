import { LeaveRequestStatus, LeaveType } from '@prisma/client';
import { LeaveReportService } from './leave-report.service';

describe('LeaveReportService', () => {
  const prisma = {
    leave: { groupBy: jest.fn() },
    employee: { findMany: jest.fn() },
  };
  const service = new LeaveReportService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.leave.groupBy
      .mockResolvedValueOnce([
        { status: LeaveRequestStatus.APPROVED, _count: { _all: 3 } },
        { status: LeaveRequestStatus.PENDING, _count: { _all: 1 } },
        { status: LeaveRequestStatus.REJECTED, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        {
          leaveType: LeaveType.ANNUAL,
          _count: { _all: 3 },
          _sum: { totalDays: 8 },
        },
        {
          leaveType: LeaveType.SICK,
          _count: { _all: 2 },
          _sum: { totalDays: 3 },
        },
      ])
      .mockResolvedValueOnce([{ employeeId: 'emp-1' }])
      .mockResolvedValueOnce([
        {
          employeeId: 'emp-1',
          _count: { _all: 2 },
          _sum: { totalDays: 5 },
        },
      ]);
    prisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1',
        employeeCode: 'EMP-001',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    ]);
  });

  it('summarizes leave requests and days by type', async () => {
    const result = await service.getReport({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    expect(result.total).toBe(5);
    expect(result.approved).toBe(3);
    expect(result.pending).toBe(1);
    expect(result.rejected).toBe(1);
    expect(result.daysByLeaveType).toEqual([
      { leaveType: 'ANNUAL', requests: 3, days: 8 },
      { leaveType: 'SICK', requests: 2, days: 3 },
    ]);
    expect(result.employeeSummaries[0]).toMatchObject({
      fullName: 'Ada Lovelace',
      days: 5,
    });
  });
});
