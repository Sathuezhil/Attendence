import { Injectable } from '@nestjs/common';
import { EmployeeStatus, LeaveRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryLeaveReportDto } from './dto/query-leave-report.dto';
import { resolveReportPeriod } from './report-period';
import { LeaveReportResponse } from './reports.types';

@Injectable()
export class LeaveReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(query: QueryLeaveReportDto): Promise<LeaveReportResponse> {
    const { start, end, period } = resolveReportPeriod(
      query.startDate,
      query.endDate,
    );
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.where(query, start, end);

    const [statusRows, typeRows, totalEmployees, employeeRows] =
      await Promise.all([
        this.prisma.leave.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.leave.groupBy({
          by: ['leaveType'],
          where,
          _count: { _all: true },
          _sum: { totalDays: true },
          orderBy: { leaveType: 'asc' },
        }),
        this.prisma.leave.groupBy({
          by: ['employeeId'],
          where,
        }),
        this.prisma.leave.groupBy({
          by: ['employeeId'],
          where,
          _count: { _all: true },
          _sum: { totalDays: true },
          orderBy: { _sum: { totalDays: 'desc' } },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

    const byStatus = Object.fromEntries(
      statusRows.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<LeaveRequestStatus, number>>;

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeRows.map((row) => row.employeeId) } },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
      },
    });
    const employeeMap = new Map(
      employees.map((employee) => [employee.id, employee]),
    );

    const total = statusRows.reduce((sum, row) => sum + row._count._all, 0);

    return {
      period,
      total,
      approved: byStatus.APPROVED ?? 0,
      rejected: byStatus.REJECTED ?? 0,
      pending: byStatus.PENDING ?? 0,
      cancelled: byStatus.CANCELLED ?? 0,
      daysByLeaveType: typeRows.map((row) => ({
        leaveType: row.leaveType,
        requests: row._count._all,
        days: row._sum.totalDays ?? 0,
      })),
      employeeSummaries: employeeRows.map((row) => {
        const employee = employeeMap.get(row.employeeId);
        return {
          employeeId: row.employeeId,
          employeeCode: employee?.employeeCode ?? '',
          fullName: employee
            ? `${employee.firstName} ${employee.lastName}`.trim()
            : 'Unknown employee',
          requests: row._count._all,
          days: row._sum.totalDays ?? 0,
        };
      }),
      page,
      limit,
      totalEmployees: totalEmployees.length,
      totalPages: Math.ceil(totalEmployees.length / limit) || 0,
    };
  }

  where(
    query: QueryLeaveReportDto,
    start: Date,
    end: Date,
  ): Prisma.LeaveWhereInput {
    return {
      employeeId: query.employeeId,
      leaveType: query.leaveType,
      status: query.status,
      startDate: { lte: end },
      endDate: { gte: start },
      employee: {
        deletedAt: null,
        status: { not: EmployeeStatus.ARCHIVED },
      },
    };
  }
}
