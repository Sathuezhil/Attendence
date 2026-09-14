import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Employee,
  EmployeeStatus,
  PayrollPaymentStatus,
  PayrollRecord,
  Prisma,
} from '@prisma/client';
import { parseOptionalDate } from '../common/utils/parse-date';
import { toDateOnly } from '../attendance/working-hours';
import { PayslipData } from '../exports/export.types';
import { roundMoney } from '../reports/report-math';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationInboxService } from '../notifications/notification-inbox.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { toMoney, toPayrollResponse } from './payroll.mapper';
import { PayrollCalculationService } from './payroll-calculation.service';
import {
  PaginatedPayroll,
  PayrollPreview,
  PayrollResponse,
} from './payroll.types';

const employeeSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  salary: true,
  status: true,
  deletedAt: true,
} satisfies Prisma.EmployeeSelect;

type PayrollWithEmployee = PayrollRecord & {
  employee: Pick<Employee, keyof typeof employeeSelect>;
};

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: PayrollCalculationService,
    private readonly inbox?: NotificationInboxService,
  ) {}

  async preview(dto: CreatePayrollDto): Promise<PayrollPreview> {
    const employee = await this.findVisibleEmployeeOrThrow(dto.employeeId);
    const amounts = this.assertAmounts({
      basicSalary: this.resolveBasicSalary(dto.basicSalary, employee.salary),
      allowances: dto.allowances,
      overtimeAmount: dto.overtimeAmount,
      deductions: dto.deductions,
      otherDeductions: dto.otherDeductions,
    });
    const totals = await this.calculation.calculate(
      employee.id,
      dto.payrollYear,
      dto.payrollMonth,
      amounts,
    );

    return {
      employeeId: employee.id,
      payrollMonth: dto.payrollMonth,
      payrollYear: dto.payrollYear,
      ...totals,
    };
  }

  async create(dto: CreatePayrollDto): Promise<PayrollResponse> {
    const employee = await this.findVisibleEmployeeOrThrow(dto.employeeId);
    const existing = await this.prisma.payrollRecord.findUnique({
      where: {
        employeeId_payrollMonth_payrollYear: {
          employeeId: employee.id,
          payrollMonth: dto.payrollMonth,
          payrollYear: dto.payrollYear,
        },
      },
    });

    if (existing && existing.paymentStatus !== PayrollPaymentStatus.CANCELLED) {
      throw new ConflictException(
        'Payroll already exists for this employee and month',
      );
    }

    const totals = await this.calculation.calculate(
      employee.id,
      dto.payrollYear,
      dto.payrollMonth,
      this.assertAmounts({
        basicSalary: this.resolveBasicSalary(dto.basicSalary, employee.salary),
        allowances: dto.allowances,
        overtimeAmount: dto.overtimeAmount,
        deductions: dto.deductions,
        otherDeductions: dto.otherDeductions,
      }),
    );

    const data = {
      employeeId: employee.id,
      payrollMonth: dto.payrollMonth,
      payrollYear: dto.payrollYear,
      basicSalary: totals.basicSalary,
      allowances: totals.allowances,
      overtimeAmount: totals.overtimeAmount,
      deductions: totals.deductions,
      unpaidLeaveDeduction: totals.unpaidLeaveDeduction,
      otherDeductions: totals.otherDeductions,
      unpaidLeaveDays: totals.unpaidLeaveDays,
      grossSalary: totals.grossSalary,
      netSalary: totals.netSalary,
      paymentStatus: PayrollPaymentStatus.PENDING,
      paymentDate: null,
      notes: dto.notes ?? null,
    };

    const record = existing
      ? await this.prisma.payrollRecord.update({
          where: { id: existing.id },
          data,
          include: { employee: { select: employeeSelect } },
        })
      : await this.prisma.payrollRecord.create({
          data,
          include: { employee: { select: employeeSelect } },
        });

    await this.inbox?.notify({
      type: 'PAYROLL_CREATED',
      title: 'Payroll created',
      message: `Payroll for ${record.employee.firstName} ${record.employee.lastName} (${dto.payrollMonth}/${dto.payrollYear}) is ready.`,
      employeeId: employee.id,
      eventKey: `payroll-created:${record.id}`,
    });

    return this.toResponse(record);
  }

  async findAll(query: QueryPayrollDto): Promise<PaginatedPayroll> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const where: Prisma.PayrollRecordWhereInput = {
      employeeId: query.employeeId,
      payrollMonth: query.month,
      payrollYear: query.year,
      paymentStatus: query.paymentStatus,
      employee: {
        deletedAt: null,
        OR: search
          ? [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeCode: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
    };

    const [total, records] = await Promise.all([
      this.prisma.payrollRecord.count({ where }),
      this.prisma.payrollRecord.findMany({
        where,
        include: { employee: { select: employeeSelect } },
        orderBy: [
          { payrollYear: 'desc' },
          { payrollMonth: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const workingDaysPerMonth = await this.calculation.getWorkingDaysPerMonth();

    return {
      data: await Promise.all(
        records.map((record) => this.toResponse(record, workingDaysPerMonth)),
      ),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findForEmployee(employeeId: string): Promise<PayrollResponse[]> {
    await this.findVisibleEmployeeOrThrow(employeeId);
    const result = await this.findAll({
      employeeId,
      page: 1,
      limit: 100,
    });
    return result.data;
  }

  async findOne(id: string): Promise<PayrollResponse> {
    return this.toResponse(await this.findOrThrow(id));
  }

  async getPayslip(id: string): Promise<PayslipData> {
    const record = await this.findOrThrow(id);
    const employee = await this.prisma.employee.findFirst({
      where: { id: record.employeeId, deletedAt: null },
      select: {
        employeeCode: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Payroll record not found');
    }

    return {
      employeeCode: employee.employeeCode,
      fullName: `${employee.firstName} ${employee.lastName}`.trim(),
      jobTitle: employee.jobTitle,
      payrollMonth: record.payrollMonth,
      payrollYear: record.payrollYear,
      basicSalary: toMoney(record.basicSalary),
      allowances: toMoney(record.allowances),
      overtimeAmount: toMoney(record.overtimeAmount),
      unpaidLeaveDays: record.unpaidLeaveDays,
      unpaidLeaveDeduction: toMoney(record.unpaidLeaveDeduction),
      otherDeductions: roundMoney(
        toMoney(record.deductions) + toMoney(record.otherDeductions),
      ),
      grossSalary: toMoney(record.grossSalary),
      netSalary: toMoney(record.netSalary),
      paymentStatus: record.paymentStatus,
      paymentDate: record.paymentDate ? toDateOnly(record.paymentDate) : null,
    };
  }

  async update(id: string, dto: UpdatePayrollDto): Promise<PayrollResponse> {
    const current = await this.findOrThrow(id);
    if (current.paymentStatus === PayrollPaymentStatus.CANCELLED) {
      throw new BadRequestException('Cancelled payroll cannot be updated');
    }
    if (current.paymentStatus === PayrollPaymentStatus.PAID) {
      if (
        dto.basicSalary !== undefined ||
        dto.allowances !== undefined ||
        dto.overtimeAmount !== undefined ||
        dto.deductions !== undefined ||
        dto.otherDeductions !== undefined
      ) {
        throw new BadRequestException('Paid payroll amounts cannot be changed');
      }

      const record = await this.prisma.payrollRecord.update({
        where: { id: current.id },
        data: { notes: dto.notes },
        include: { employee: { select: employeeSelect } },
      });
      return this.toResponse(record);
    }

    const totals = await this.calculation.calculate(
      current.employeeId,
      current.payrollYear,
      current.payrollMonth,
      {
        basicSalary: dto.basicSalary ?? toMoney(current.basicSalary),
        allowances: dto.allowances ?? toMoney(current.allowances),
        overtimeAmount: dto.overtimeAmount ?? toMoney(current.overtimeAmount),
        deductions: dto.deductions ?? toMoney(current.deductions),
        otherDeductions:
          dto.otherDeductions ?? toMoney(current.otherDeductions),
      },
    );

    const record = await this.prisma.payrollRecord.update({
      where: { id: current.id },
      data: {
        basicSalary: totals.basicSalary,
        allowances: totals.allowances,
        overtimeAmount: totals.overtimeAmount,
        deductions: totals.deductions,
        unpaidLeaveDeduction: totals.unpaidLeaveDeduction,
        otherDeductions: totals.otherDeductions,
        unpaidLeaveDays: totals.unpaidLeaveDays,
        grossSalary: totals.grossSalary,
        netSalary: totals.netSalary,
        notes: dto.notes,
      },
      include: { employee: { select: employeeSelect } },
    });

    return this.toResponse(record);
  }

  async markPaid(id: string, dto: MarkPaidDto): Promise<PayrollResponse> {
    const current = await this.findOrThrow(id);
    if (current.paymentStatus === PayrollPaymentStatus.CANCELLED) {
      throw new BadRequestException('Cancelled payroll cannot be marked paid');
    }
    if (current.paymentStatus === PayrollPaymentStatus.PAID) {
      return this.toResponse(current);
    }

    const paymentDate =
      parseOptionalDate(dto.paymentDate, 'paymentDate') ?? new Date();
    const record = await this.prisma.payrollRecord.update({
      where: { id: current.id },
      data: {
        paymentStatus: PayrollPaymentStatus.PAID,
        paymentDate,
      },
      include: { employee: { select: employeeSelect } },
    });

    return this.toResponse(record);
  }

  async cancel(id: string): Promise<PayrollResponse> {
    const current = await this.findOrThrow(id);
    if (current.paymentStatus === PayrollPaymentStatus.CANCELLED) {
      return this.toResponse(current);
    }

    const record = await this.prisma.payrollRecord.update({
      where: { id: current.id },
      data: {
        paymentStatus: PayrollPaymentStatus.CANCELLED,
      },
      include: { employee: { select: employeeSelect } },
    });

    return this.toResponse(record);
  }

  private async toResponse(
    record: PayrollWithEmployee,
    workingDaysPerMonth?: number,
  ): Promise<PayrollResponse> {
    const days =
      workingDaysPerMonth ?? (await this.calculation.getWorkingDaysPerMonth());
    const calculation = {
      basicSalary: toMoney(record.basicSalary),
      allowances: toMoney(record.allowances),
      overtimeAmount: toMoney(record.overtimeAmount),
      deductions: toMoney(record.deductions),
      otherDeductions: toMoney(record.otherDeductions),
      unpaidLeaveDays: record.unpaidLeaveDays,
      unpaidLeaveDeduction: toMoney(record.unpaidLeaveDeduction),
      workingDaysPerMonth: days,
      dailyRate: 0,
      grossSalary: toMoney(record.grossSalary),
      netSalary: toMoney(record.netSalary),
    };
    calculation.dailyRate =
      days > 0 ? Math.round((calculation.basicSalary / days) * 100) / 100 : 0;

    return toPayrollResponse(record, calculation);
  }

  private assertAmounts(amounts: {
    basicSalary: number;
    allowances?: number;
    overtimeAmount?: number;
    deductions?: number;
    otherDeductions?: number;
  }) {
    const fields: Array<[string, number | undefined]> = [
      ['basicSalary', amounts.basicSalary],
      ['allowances', amounts.allowances],
      ['overtimeAmount', amounts.overtimeAmount],
      ['deductions', amounts.deductions],
      ['otherDeductions', amounts.otherDeductions],
    ];

    for (const [field, value] of fields) {
      if (value !== undefined && value < 0) {
        throw new BadRequestException(`${field} cannot be negative`);
      }
    }

    return amounts;
  }

  private resolveBasicSalary(
    provided: number | undefined,
    employeeSalary: Prisma.Decimal | null,
  ): number {
    if (provided !== undefined) {
      return provided;
    }

    if (employeeSalary !== null) {
      return toMoney(employeeSalary);
    }

    throw new BadRequestException('basicSalary is required');
  }

  private async findOrThrow(id: string): Promise<PayrollWithEmployee> {
    const record = await this.prisma.payrollRecord.findFirst({
      where: { id, employee: { deletedAt: null } },
      include: { employee: { select: employeeSelect } },
    });

    if (!record) {
      throw new NotFoundException('Payroll record not found');
    }

    return record;
  }

  private async findVisibleEmployeeOrThrow(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      select: employeeSelect,
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.status === EmployeeStatus.ARCHIVED) {
      throw new BadRequestException('Employee is not available');
    }

    return employee;
  }
}
