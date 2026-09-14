import { PayrollCalculationService } from './payroll-calculation.service';

describe('PayrollCalculationService', () => {
  const prisma = {
    appSetting: { findUnique: jest.fn() },
    leave: { findMany: jest.fn() },
  };
  const config = {
    get: jest.fn(() => 26),
  };

  let service: PayrollCalculationService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appSetting.findUnique.mockResolvedValue(null);
    service = new PayrollCalculationService(prisma as never, config as never);
  });

  it('counts approved unpaid leave that overlaps the payroll month', async () => {
    prisma.leave.findMany.mockResolvedValue([
      {
        startDate: new Date('2026-09-10T00:00:00.000Z'),
        endDate: new Date('2026-09-11T00:00:00.000Z'),
      },
    ]);

    await expect(
      service.countApprovedUnpaidDays('emp-1', 2026, 9),
    ).resolves.toBe(2);
    expect(prisma.leave.findMany).toHaveBeenCalledTimes(1);
  });
});
