import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';

const employee = {
  id: '11111111-1111-1111-1111-111111111111',
  employeeCode: 'EMP-001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  salary: 2600,
  status: 'ACTIVE',
  deletedAt: null,
};

const totals = {
  basicSalary: 2600,
  allowances: 200,
  overtimeAmount: 100,
  deductions: 50,
  otherDeductions: 0,
  unpaidLeaveDays: 2,
  unpaidLeaveDeduction: 200,
  workingDaysPerMonth: 26,
  dailyRate: 100,
  grossSalary: 2900,
  netSalary: 2650,
};

const record = {
  id: '22222222-2222-2222-2222-222222222222',
  employeeId: employee.id,
  payrollMonth: 9,
  payrollYear: 2026,
  ...totals,
  paymentStatus: 'PENDING',
  paymentDate: null,
  notes: null,
  createdAt: new Date('2026-09-12T08:00:00.000Z'),
  updatedAt: new Date('2026-09-12T08:00:00.000Z'),
  employee,
};

describe('PayrollService', () => {
  const prisma = {
    employee: { findFirst: jest.fn() },
    payrollRecord: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const calculation = {
    calculate: jest.fn(),
    getWorkingDaysPerMonth: jest.fn(),
    countApprovedUnpaidDays: jest.fn(),
  };

  let service: PayrollService;

  beforeEach(() => {
    jest.clearAllMocks();
    calculation.calculate.mockResolvedValue(totals);
    calculation.getWorkingDaysPerMonth.mockResolvedValue(26);
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.payrollRecord.findUnique.mockResolvedValue(null);
    service = new PayrollService(prisma as never, calculation as never);
  });

  it('creates payroll with backend-calculated totals', async () => {
    prisma.payrollRecord.findUnique.mockResolvedValue(null);
    prisma.payrollRecord.create.mockResolvedValue(record);

    const result = await service.create({
      employeeId: employee.id,
      payrollMonth: 9,
      payrollYear: 2026,
      basicSalary: 2600,
      allowances: 200,
      overtimeAmount: 100,
      deductions: 50,
    });

    expect(result.grossSalary).toBe(2900);
    expect(result.netSalary).toBe(2650);
    expect(result.unpaidLeaveDeduction).toBe(200);
    expect(prisma.payrollRecord.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate month for the same employee', async () => {
    prisma.payrollRecord.findUnique.mockResolvedValue(record);

    await expect(
      service.create({
        employeeId: employee.id,
        payrollMonth: 9,
        payrollYear: 2026,
        basicSalary: 2600,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a missing employee', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        employeeId: employee.id,
        payrollMonth: 9,
        payrollYear: 2026,
        basicSalary: 2600,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects negative salary values', async () => {
    await expect(
      service.create({
        employeeId: employee.id,
        payrollMonth: 9,
        payrollYear: 2026,
        basicSalary: -10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks a pending record as paid', async () => {
    prisma.payrollRecord.findFirst.mockResolvedValue(record);
    prisma.payrollRecord.update.mockResolvedValue({
      ...record,
      paymentStatus: 'PAID',
      paymentDate: new Date('2026-09-30T00:00:00.000Z'),
    });

    const result = await service.markPaid(record.id, {});
    expect(result.paymentStatus).toBe('PAID');
  });

  it('cancels instead of hard-deleting payroll', async () => {
    prisma.payrollRecord.findFirst.mockResolvedValue(record);
    prisma.payrollRecord.update.mockResolvedValue({
      ...record,
      paymentStatus: 'CANCELLED',
    });

    const result = await service.cancel(record.id);
    expect(result.paymentStatus).toBe('CANCELLED');
  });

  it('searches payroll by employee name and code on the server', async () => {
    prisma.payrollRecord.count.mockResolvedValue(0);
    prisma.payrollRecord.findMany.mockResolvedValue([]);

    await service.findAll({
      search: 'Ada',
      month: 9,
      year: 2026,
      page: 1,
      limit: 20,
    });

    expect(prisma.payrollRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        where: expect.objectContaining({
          payrollMonth: 9,
          payrollYear: 2026,
          employee: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'Ada', mode: 'insensitive' } },
            ]),
          }),
        }),
      }),
    );
  });

  it('lists payroll history newest first', async () => {
    prisma.payrollRecord.count.mockResolvedValue(1);
    prisma.payrollRecord.findMany.mockResolvedValue([record]);

    const result = await service.findForEmployee(employee.id);
    expect(result).toHaveLength(1);
    expect(prisma.payrollRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { payrollYear: 'desc' },
          { payrollMonth: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
    );
  });
});
