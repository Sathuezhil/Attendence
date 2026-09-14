import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, LeaveRequestStatus, LeaveType } from '@prisma/client';
import { LeaveService } from './leave.service';

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

const pendingLeave = {
  id: '33333333-3333-3333-3333-333333333333',
  employeeId: employee.id,
  leaveType: LeaveType.ANNUAL,
  startDate: new Date('2026-10-01T00:00:00.000Z'),
  endDate: new Date('2026-10-05T00:00:00.000Z'),
  totalDays: 5,
  reason: null,
  status: LeaveRequestStatus.PENDING,
  approvedById: null,
  approvedAt: null,
  rejectionReason: null,
  createdAt: new Date('2026-09-12T00:00:00.000Z'),
  updatedAt: new Date('2026-09-12T00:00:00.000Z'),
  employee,
};

describe('LeaveService', () => {
  const prisma = {
    employee: { findFirst: jest.fn() },
    leave: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: LeaveService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeaveService(prisma as never);
  });

  it('creates leave and calculates total days on the backend', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.leave.findFirst.mockResolvedValue(null);
    prisma.leave.create.mockResolvedValue(pendingLeave);

    const result = await service.create({
      employeeId: employee.id,
      leaveType: LeaveType.ANNUAL,
      startDate: '2026-10-01',
      endDate: '2026-10-05',
    });

    expect(result.totalDays).toBe(5);
    expect(prisma.leave.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an end date before the start date', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);

    await expect(
      service.create({
        employeeId: employee.id,
        leaveType: LeaveType.ANNUAL,
        startDate: '2026-10-05',
        endDate: '2026-10-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects overlapping pending or approved leave', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.leave.findFirst.mockResolvedValue(pendingLeave);

    await expect(
      service.create({
        employeeId: employee.id,
        leaveType: LeaveType.SICK,
        startDate: '2026-10-03',
        endDate: '2026-10-07',
        reason: 'Fever',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires a reason for sick leave', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);

    await expect(
      service.create({
        employeeId: employee.id,
        leaveType: LeaveType.SICK,
        startDate: '2026-10-10',
        endDate: '2026-10-11',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves pending leave', async () => {
    prisma.leave.findUnique.mockResolvedValue(pendingLeave);
    prisma.leave.findFirst.mockResolvedValue(null);
    prisma.leave.update.mockResolvedValue({
      ...pendingLeave,
      status: LeaveRequestStatus.APPROVED,
      approvedById: 'admin-1',
      approvedAt: new Date(),
    });

    const result = await service.approve(pendingLeave.id, 'admin-1');
    expect(result.status).toBe(LeaveRequestStatus.APPROVED);
  });

  it('rejects pending leave with a reason', async () => {
    prisma.leave.findUnique.mockResolvedValue(pendingLeave);
    prisma.leave.update.mockResolvedValue({
      ...pendingLeave,
      status: LeaveRequestStatus.REJECTED,
      rejectionReason: 'Coverage missing',
    });

    const result = await service.reject(pendingLeave.id, {
      rejectionReason: 'Coverage missing',
    });
    expect(result.status).toBe(LeaveRequestStatus.REJECTED);
  });

  it('cancels approved leave', async () => {
    prisma.leave.findUnique.mockResolvedValue({
      ...pendingLeave,
      status: LeaveRequestStatus.APPROVED,
    });
    prisma.leave.update.mockResolvedValue({
      ...pendingLeave,
      status: LeaveRequestStatus.CANCELLED,
    });

    const result = await service.cancel(pendingLeave.id);
    expect(result.status).toBe(LeaveRequestStatus.CANCELLED);
  });

  it('throws when the employee is missing', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        employeeId: employee.id,
        leaveType: LeaveType.ANNUAL,
        startDate: '2026-10-01',
        endDate: '2026-10-02',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
