import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSettingKey, LeaveRequestStatus, LeaveType } from '@prisma/client';
import { AppConfiguration } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculatePayroll,
  DEFAULT_WORKING_DAYS_PER_MONTH,
  monthDateRange,
  overlappingDays,
  PayrollCalculation,
  resolveOvertimeEnabled,
  resolveWorkingDaysPerMonth,
} from './payroll-calculation';

export interface PayrollAmountInput {
  basicSalary: number;
  allowances?: number;
  overtimeAmount?: number;
  deductions?: number;
  otherDeductions?: number;
}

@Injectable()
export class PayrollCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async getWorkingDaysPerMonth(): Promise<number> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: AppSettingKey.PAYROLL_WORKING_DAYS_PER_MONTH },
    });
    const fallback = this.config.get('payrollWorkingDaysPerMonth', {
      infer: true,
    });

    return resolveWorkingDaysPerMonth(
      setting?.value,
      fallback || DEFAULT_WORKING_DAYS_PER_MONTH,
    );
  }

  async isOvertimeEnabled(): Promise<boolean> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: AppSettingKey.PAYROLL_WORKING_DAYS_PER_MONTH },
    });
    return resolveOvertimeEnabled(setting?.value);
  }

  async countApprovedUnpaidDays(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const range = monthDateRange(year, month);
    const leaves = await this.prisma.leave.findMany({
      where: {
        employeeId,
        leaveType: LeaveType.UNPAID,
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: range.end },
        endDate: { gte: range.start },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    return leaves.reduce(
      (total, leave) =>
        total +
        overlappingDays(leave.startDate, leave.endDate, range.start, range.end),
      0,
    );
  }

  async calculate(
    employeeId: string,
    year: number,
    month: number,
    amounts: PayrollAmountInput,
  ): Promise<PayrollCalculation> {
    const [workingDaysPerMonth, unpaidLeaveDays, overtimeEnabled] =
      await Promise.all([
        this.getWorkingDaysPerMonth(),
        this.countApprovedUnpaidDays(employeeId, year, month),
        this.isOvertimeEnabled(),
      ]);

    return calculatePayroll({
      basicSalary: amounts.basicSalary,
      allowances: amounts.allowances ?? 0,
      overtimeAmount: overtimeEnabled ? (amounts.overtimeAmount ?? 0) : 0,
      deductions: amounts.deductions ?? 0,
      otherDeductions: amounts.otherDeductions ?? 0,
      unpaidLeaveDays,
      workingDaysPerMonth,
    });
  }
}
