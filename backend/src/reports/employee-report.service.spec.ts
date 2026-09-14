import { EmployeeStatus } from '@prisma/client';
import { EmployeeReportService } from './employee-report.service';

describe('EmployeeReportService', () => {
  const prisma = {
    employee: { groupBy: jest.fn() },
  };
  const service = new EmployeeReportService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates employee counts from the database', async () => {
    prisma.employee.groupBy.mockResolvedValueOnce([
      { status: EmployeeStatus.ACTIVE, _count: { _all: 4 } },
      { status: EmployeeStatus.INACTIVE, _count: { _all: 1 } },
      { status: EmployeeStatus.ON_LEAVE, _count: { _all: 2 } },
    ]);

    await expect(service.getReport({})).resolves.toEqual({
      total: 7,
      active: 4,
      inactive: 1,
      onLeave: 2,
      terminated: 0,
    });
  });

  it('returns zeros when no employees match', async () => {
    prisma.employee.groupBy.mockResolvedValue([]);

    await expect(
      service.getReport({ jobTitle: 'None' }),
    ).resolves.toMatchObject({
      total: 0,
      active: 0,
    });
  });
});
