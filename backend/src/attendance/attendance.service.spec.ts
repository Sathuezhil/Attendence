import {
  BadRequestException,
  ConflictException,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, EmployeeStatus, Prisma } from '@prisma/client';
import { AttendanceService } from './attendance.service';

const employee = {
  id: '11111111-1111-1111-1111-111111111111',
  employeeCode: 'EMP-001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  department: 'IT',
  jobTitle: 'Engineer',
  status: EmployeeStatus.ACTIVE,
  deletedAt: null,
};

const record = {
  id: '22222222-2222-2222-2222-222222222222',
  employeeId: employee.id,
  date: new Date('2026-09-12T00:00:00.000Z'),
  status: AttendanceStatus.PRESENT,
  checkIn: new Date('2026-09-12T09:00:00.000Z'),
  checkOut: null,
  lateMinutes: 0,
  workingMinutes: null,
  notes: null,
  source: 'MANUAL',
  metadata: null,
  createdAt: new Date('2026-09-12T09:00:00.000Z'),
  updatedAt: new Date('2026-09-12T09:00:00.000Z'),
  employee,
};

describe('AttendanceService', () => {
  const prisma = {
    appSetting: { findUnique: jest.fn() },
    employee: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
    attendance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appSetting.findUnique.mockResolvedValue(null);
    service = new AttendanceService(prisma as never);
  });

  it('summarizes today without creating absent rows', async () => {
    prisma.employee.count.mockResolvedValue(5);
    prisma.attendance.groupBy.mockResolvedValue([
      { status: AttendanceStatus.PRESENT, _count: { _all: 2 } },
      { status: AttendanceStatus.LATE, _count: { _all: 1 } },
    ]);

    const summary = await service.getSummaryCounts(
      new Date('2026-09-12T00:00:00.000Z'),
    );

    expect(summary.totalEmployees).toBe(5);
    expect(summary.present).toBe(2);
    expect(summary.late).toBe(1);
    expect(summary.absent).toBe(2);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it('rejects check-in for a missing employee', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(
      service.checkIn({ employeeId: employee.id }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a second check-in for the same day', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.attendance.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['employee_id', 'date'] },
      }),
    );

    await expect(
      service.checkIn({ employeeId: employee.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects check-out before check-in', async () => {
    prisma.attendance.findUnique.mockResolvedValue({
      ...record,
      checkIn: null,
    });

    await expect(service.checkOut(record.id, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a second check-out', async () => {
    prisma.attendance.findUnique.mockResolvedValue({
      ...record,
      checkOut: new Date('2026-09-12T18:00:00.000Z'),
    });

    await expect(service.checkOut(record.id, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('records check-out and working minutes', async () => {
    prisma.attendance.findUnique.mockResolvedValue(record);
    prisma.attendance.update.mockResolvedValue({
      ...record,
      checkOut: new Date('2026-09-12T18:00:00.000Z'),
      workingMinutes: 540,
    });

    const result = await service.checkOut(record.id, {
      checkOut: '2026-09-12T18:00:00.000Z',
    });

    expect(result.workingMinutes).toBe(540);
    expect(prisma.attendance.update).toHaveBeenCalledTimes(1);
  });

  it('does not permanently delete attendance', () => {
    expect(() => service.refuseDelete()).toThrow(MethodNotAllowedException);
  });
});
