import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
import { EmployeesService } from './employees.service';

const employee = {
  id: '11111111-1111-1111-1111-111111111111',
  employeeCode: 'EMP-001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+971500000001',
  alternatePhone: null,
  dateOfBirth: new Date('1815-12-10T00:00:00.000Z'),
  gender: null,
  nationality: null,
  address: null,
  jobTitle: 'Engineer',
  department: 'IT',
  joiningDate: new Date('2020-01-01T00:00:00.000Z'),
  salary: 1000,
  status: EmployeeStatus.ACTIVE,
  profileImageUrl: null,
  deletedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('EmployeesService', () => {
  const prisma = {
    employee: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: EmployeesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeesService(prisma as never);
  });

  it('creates an employee and derives fullName', async () => {
    prisma.employee.create.mockResolvedValue(employee);

    const result = await service.create({
      employeeCode: 'EMP-001',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(result.fullName).toBe('Ada Lovelace');
    expect(result.employmentStatus).toBe(EmployeeStatus.ACTIVE);
    expect(result.jobTitle).toBe('Engineer');
    expect(result.basicSalary).toBe(1000);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('maps a duplicate employee code to a conflict', async () => {
    prisma.employee.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['employee_code'] },
      }),
    );

    await expect(
      service.create({
        employeeCode: 'EMP-001',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('excludes soft-deleted employees from the list', async () => {
    prisma.employee.count.mockResolvedValue(1);
    prisma.employee.findMany.mockResolvedValue([employee]);

    await service.findAll({ search: 'Ada' });

    expect(prisma.employee.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.employee.count).toHaveBeenCalledTimes(1);
  });

  it('throws when an employee is missing', async () => {
    prisma.employee.findFirst.mockResolvedValue(null);

    await expect(service.findOne(employee.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('soft-deletes instead of destroying the record', async () => {
    prisma.employee.findFirst.mockResolvedValue(employee);
    prisma.employee.update.mockResolvedValue({
      ...employee,
      status: EmployeeStatus.INACTIVE,
      deletedAt: new Date(),
    });

    const result = await service.deactivate(employee.id);

    expect(prisma.employee.update).toHaveBeenCalledTimes(1);
    expect(result.employmentStatus).toBe(EmployeeStatus.INACTIVE);
  });

  it('rejects a date of birth in the future', async () => {
    await expect(
      service.create({
        employeeCode: 'EMP-002',
        firstName: 'Ada',
        lastName: 'Lovelace',
        dateOfBirth: '2999-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
