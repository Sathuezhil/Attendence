import { Injectable } from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
import { parseOptionalDate } from '../common/utils/parse-date';
import { PrismaService } from '../prisma/prisma.service';
import { QueryEmployeeReportDto } from './dto/query-employee-report.dto';
import { EmployeeReportResponse } from './reports.types';

const visibleEmployee: Prisma.EmployeeWhereInput = {
  deletedAt: null,
  status: { not: EmployeeStatus.ARCHIVED },
};

@Injectable()
export class EmployeeReportService {
  constructor(private readonly prisma: PrismaService) {}

  where(query: QueryEmployeeReportDto): Prisma.EmployeeWhereInput {
    return this.buildWhere(query);
  }

  async getReport(
    query: QueryEmployeeReportDto,
  ): Promise<EmployeeReportResponse> {
    const where = this.where(query);
    const statusRows = await this.prisma.employee.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const byStatus = Object.fromEntries(
      statusRows.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<EmployeeStatus, number>>;

    const total = statusRows.reduce((sum, row) => sum + row._count._all, 0);

    return {
      total,
      active: byStatus.ACTIVE ?? 0,
      inactive: byStatus.INACTIVE ?? 0,
      onLeave: byStatus.ON_LEAVE ?? 0,
      terminated: byStatus.TERMINATED ?? 0,
    };
  }

  private buildWhere(query: QueryEmployeeReportDto): Prisma.EmployeeWhereInput {
    const joiningFrom = parseOptionalDate(query.joiningFrom, 'joiningFrom');
    const joiningTo = parseOptionalDate(query.joiningTo, 'joiningTo');

    return {
      ...visibleEmployee,
      status: query.status,
      jobTitle: query.jobTitle
        ? { equals: query.jobTitle, mode: 'insensitive' }
        : undefined,
      joiningDate: {
        gte: joiningFrom ?? undefined,
        lte: joiningTo ?? undefined,
      },
    };
  }
}
