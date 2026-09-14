import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Employee, EmployeeStatus, Prisma } from '@prisma/client';
import { parseOptionalDate } from '../common/utils/parse-date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { emptyToNull, toEmployeeResponse } from './employees.mapper';
import { EmployeeResponse, PaginatedEmployees } from './employees.types';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeResponse> {
    const dateOfBirth = parseOptionalDate(dto.dateOfBirth, 'dateOfBirth');
    const joiningDate = parseOptionalDate(dto.joiningDate, 'joiningDate');
    this.assertDateRules(dateOfBirth, joiningDate);

    try {
      const employee = await this.prisma.employee.create({
        data: {
          employeeCode: dto.employeeCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: emptyToNull(dto.email) ?? null,
          phone: emptyToNull(dto.phone) ?? null,
          alternatePhone: emptyToNull(dto.alternatePhone) ?? null,
          dateOfBirth,
          gender: dto.gender,
          nationality: emptyToNull(dto.nationality) ?? null,
          jobTitle: emptyToNull(dto.jobTitle) ?? null,
          joiningDate,
          status: dto.employmentStatus ?? EmployeeStatus.ACTIVE,
          salary: dto.basicSalary ?? null,
        },
      });

      return toEmployeeResponse(employee);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async findAll(query: QueryEmployeesDto): Promise<PaginatedEmployees> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildListWhere(query);

    const [total, employees] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: employees.map(toEmployeeResponse),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findOne(id: string): Promise<EmployeeResponse> {
    return toEmployeeResponse(await this.findActiveOrThrow(id));
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeResponse> {
    await this.findActiveOrThrow(id);

    const dateOfBirth = parseOptionalDate(dto.dateOfBirth, 'dateOfBirth');
    const joiningDate = parseOptionalDate(dto.joiningDate, 'joiningDate');
    this.assertDateRules(dateOfBirth, joiningDate);

    try {
      const employee = await this.prisma.employee.update({
        where: { id },
        data: {
          employeeCode: dto.employeeCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: emptyToNull(dto.email),
          phone: emptyToNull(dto.phone),
          alternatePhone: emptyToNull(dto.alternatePhone),
          dateOfBirth,
          gender: dto.gender,
          nationality: emptyToNull(dto.nationality),
          jobTitle: emptyToNull(dto.jobTitle),
          joiningDate,
          status: dto.employmentStatus,
          salary: dto.basicSalary,
        },
      });

      return toEmployeeResponse(employee);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async remove(id: string): Promise<EmployeeResponse> {
    await this.findActiveOrThrow(id);

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        status: EmployeeStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return toEmployeeResponse(employee);
  }

  private async findActiveOrThrow(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  private buildListWhere(query: QueryEmployeesDto): Prisma.EmployeeWhereInput {
    const search = query.search?.trim();
    const joiningFrom = parseOptionalDate(query.joiningFrom, 'joiningFrom');
    const joiningTo = parseOptionalDate(query.joiningTo, 'joiningTo');
    if (
      joiningFrom &&
      joiningTo &&
      joiningTo.getTime() < joiningFrom.getTime()
    ) {
      throw new BadRequestException('joiningTo cannot be before joiningFrom');
    }

    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      status: query.employmentStatus,
      jobTitle: query.jobTitle
        ? { contains: query.jobTitle, mode: 'insensitive' }
        : undefined,
      joiningDate: {
        gte: joiningFrom ?? undefined,
        lte: joiningTo ?? undefined,
      },
    };

    if (search) {
      where.OR = [
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private assertDateRules(
    dateOfBirth?: Date | null,
    joiningDate?: Date | null,
  ): void {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (dateOfBirth && dateOfBirth.getTime() >= today.getTime()) {
      throw new BadRequestException('dateOfBirth must be in the past');
    }

    if (
      joiningDate &&
      dateOfBirth &&
      joiningDate.getTime() <= dateOfBirth.getTime()
    ) {
      throw new BadRequestException('joiningDate must be after dateOfBirth');
    }
  }

  private rethrowKnownError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const targetText = Array.isArray(target)
        ? target
            .filter((item): item is string => typeof item === 'string')
            .join(',')
        : typeof target === 'string'
          ? target
          : '';

      if (
        targetText.includes('employee_code') ||
        targetText.includes('employeeCode')
      ) {
        throw new ConflictException(
          'An employee with this code already exists',
        );
      }

      if (targetText.includes('email')) {
        throw new ConflictException(
          'An employee with this email already exists',
        );
      }

      throw new ConflictException('Employee already exists');
    }

    this.logger.error('Unexpected employee persistence error', error);
    throw new BadRequestException('Unable to save employee');
  }
}
