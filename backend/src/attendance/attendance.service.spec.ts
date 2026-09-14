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
      upsert: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    leave: { findMany: jest.fn() },
  };

  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.appSetting.findUnique.mockResolvedValue(null);
    prisma.leave.findMany.mockResolvedValue([]);
    service = new AttendanceService(
      prisma as never,
      {
        notify: jest.fn(),
      } as never,
    );
  });

  it('summarizes today without creating absent rows', async () => {
    prisma.employee.count.mockResolvedValue(5);
    prisma.attendance.findMany.mockResolvedValue([
      {
        employeeId: 'a',
        status: AttendanceStatus.PRESENT,
        checkIn: new Date(),
      },
      {
        employeeId: 'b',
        status: AttendanceStatus.PRESENT,
        checkIn: new Date(),
      },
      { employeeId: 'c', status: AttendanceStatus.LATE, checkIn: new Date() },
    ]);

    const summary = await service.getSummaryCounts(
      new Date('2026-09-12T00:00:00.000Z'),
    );

    expect(summary.totalEmployees).toBe(5);
    expect(summary.present).toBe(3);
    expect(summary.late).toBe(0);
    expect(summary.absent).toBe(0);
    expect(summary.onLeave).toBe(2);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it('counts approved leave as on leave without creating attendance rows', async () => {
    prisma.employee.count.mockResolvedValue(5);
    prisma.attendance.findMany.mockResolvedValue([
      {
        employeeId: 'a',
        status: AttendanceStatus.PRESENT,
        checkIn: new Date(),
      },
    ]);
    prisma.leave.findMany.mockResolvedValue([{ employeeId: 'leave-1' }]);

    const summary = await service.getSummaryCounts(
      new Date('2026-09-12T00:00:00.000Z'),
    );

    expect(summary.onLeave).toBe(4);
    expect(summary.present).toBe(1);
    expect(summary.absent).toBe(0);
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

  it('filters attendance history by lateOnly on the server', async () => {
    prisma.attendance.count.mockResolvedValue(0);
    prisma.attendance.findMany.mockResolvedValue([]);

    await service.findAll({ lateOnly: true, page: 1, limit: 20 });

    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        where: expect.objectContaining({
          status: { in: [AttendanceStatus.LATE] },
        }),
      }),
    );
  });

  it('rejects combining lateOnly and absentOnly', async () => {
    await expect(
      service.findAll({ lateOnly: true, absentOnly: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not permanently delete attendance', () => {
    expect(() => service.refuseDelete()).toThrow(MethodNotAllowedException);
  });

  it('marks today as off day even when no attendance row exists', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.attendance.upsert.mockResolvedValue({
      ...record,
      status: AttendanceStatus.HOLIDAY,
      checkIn: null,
      checkOut: null,
      lateMinutes: null,
      workingMinutes: null,
    });

    const result = await service.markDay({
      employeeId: employee.id,
      status: AttendanceStatus.HOLIDAY,
    });

    expect(result.status).toBe(AttendanceStatus.HOLIDAY);
    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          employeeId: employee.id,
          status: AttendanceStatus.HOLIDAY,
        }),
        update: expect.objectContaining({
          status: AttendanceStatus.HOLIDAY,
          checkIn: null,
          checkOut: null,
        }),
      }),
    );
  });

  it('keeps check-in times when marking today as active', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.attendance.upsert.mockResolvedValue(record);

    await service.markDay({
      employeeId: employee.id,
      status: AttendanceStatus.PRESENT,
    });

    expect(prisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: AttendanceStatus.PRESENT },
      }),
    );
  });

  it('rejects marking a day for a missing employee', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(
      service.markDay({
        employeeId: employee.id,
        status: AttendanceStatus.ON_LEAVE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
