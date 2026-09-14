import { Injectable } from '@nestjs/common';
import { EmployeeStatus, PayrollPaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryPayrollReportDto } from './dto/query-payroll-report.dto';
import { roundMoney } from './report-math';
import { todayUtcDate } from './report-period';
import { PayrollReportResponse } from './reports.types';

@Injectable()
export class PayrollReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(
    query: QueryPayrollReportDto,
  ): Promise<PayrollReportResponse> {
    const where = this.where(query);
    const moneyWhere = this.moneyWhere(query);

    const [totals, statusRows, trendRows] = await Promise.all([
      this.prisma.payrollRecord.aggregate({
        where: moneyWhere,
        _count: { _all: true },
        _sum: {
          grossSalary: true,
          netSalary: true,
          deductions: true,
          unpaidLeaveDeduction: true,
          otherDeductions: true,
        },
      }),
      this.prisma.payrollRecord.groupBy({
        by: ['paymentStatus'],
        where,
        _count: { _all: true },
        _sum: { netSalary: true },
      }),
      this.prisma.payrollRecord.groupBy({
        by: ['payrollYear', 'payrollMonth'],
        where: moneyWhere,
        _sum: { grossSalary: true, netSalary: true },
        orderBy: [{ payrollYear: 'asc' }, { payrollMonth: 'asc' }],
      }),
    ]);

    const byStatus = Object.fromEntries(
      statusRows.map((row) => [
        row.paymentStatus,
        {
          count: row._count._all,
          net: roundMoney(row._sum.netSalary ?? 0),
        },
      ]),
    ) as Partial<Record<PayrollPaymentStatus, { count: number; net: number }>>;

    const totalPayroll = query.paymentStatus
      ? (byStatus[query.paymentStatus]?.count ?? 0)
      : statusRows
          .filter((row) => row.paymentStatus !== PayrollPaymentStatus.CANCELLED)
          .reduce((sum, row) => sum + row._count._all, 0);

    return {
      totalPayroll,
      grossSalary: roundMoney(totals._sum.grossSalary ?? 0),
      totalDeductions: roundMoney(
        Number(totals._sum.deductions ?? 0) +
          Number(totals._sum.unpaidLeaveDeduction ?? 0) +
          Number(totals._sum.otherDeductions ?? 0),
      ),
      netSalary: roundMoney(totals._sum.netSalary ?? 0),
      paidAmount: byStatus.PAID?.net ?? 0,
      pendingAmount: byStatus.PENDING?.net ?? 0,
      monthlyTrend: this.limitTrend(
        trendRows.map((row) => ({
          year: row.payrollYear,
          month: row.payrollMonth,
          grossSalary: roundMoney(row._sum.grossSalary ?? 0),
          netSalary: roundMoney(row._sum.netSalary ?? 0),
        })),
        query.year,
      ),
    };
  }

  moneyWhere(query: QueryPayrollReportDto): Prisma.PayrollRecordWhereInput {
    return {
      ...this.where(query),
      paymentStatus: query.paymentStatus ?? {
        not: PayrollPaymentStatus.CANCELLED,
      },
    };
  }

  where(query: QueryPayrollReportDto): Prisma.PayrollRecordWhereInput {
    return {
      payrollMonth: query.month,
      payrollYear: query.year,
      employeeId: query.employeeId,
      paymentStatus: query.paymentStatus,
      employee: {
        deletedAt: null,
        status: { not: EmployeeStatus.ARCHIVED },
      },
    };
  }

  private limitTrend(
    points: PayrollReportResponse['monthlyTrend'],
    year?: number,
  ): PayrollReportResponse['monthlyTrend'] {
    if (year) {
      return points.filter((point) => point.year === year);
    }

    const today = todayUtcDate();
    const cutoffYear = today.getUTCFullYear() - 1;
    const cutoffMonth = today.getUTCMonth() + 1;

    return points.filter(
      (point) =>
        point.year > cutoffYear ||
        (point.year === cutoffYear && point.month >= cutoffMonth),
    );
  }
}
