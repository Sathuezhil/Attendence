import { Injectable } from '@nestjs/common';
import { AttendanceStatus, EmployeeStatus, Prisma } from '@prisma/client';
import { toPublicStatus, storedStatusesForPublic } from '../attendance/attendance.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAttendanceReportDto } from './dto/query-attendance-report.dto';
import { attendancePercentage, minutesToHours } from './report-math';
import { resolveReportPeriod } from './report-period';
import { AttendanceReportResponse } from './reports.types';

@Injectable()
export class AttendanceReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(
    query: QueryAttendanceReportDto,
  ): Promise<AttendanceReportResponse> {
    const { start, end, period } = resolveReportPeriod(
      query.startDate,
      query.endDate,
    );
    const rows = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: this.where(query, start, end),
      _count: { _all: true },
      _sum: { workingMinutes: true, lateMinutes: true },
    });

    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
    };
    let workingMinutes = 0;
    let lateMinutes = 0;

    for (const row of rows) {
      const count = row._count._all;
      workingMinutes += Number(row._sum.workingMinutes ?? 0);
      lateMinutes += Number(row._sum.lateMinutes ?? 0);

      switch (toPublicStatus(row.status)) {
        case AttendanceStatus.PRESENT:
          counts.present += count;
          break;
        case AttendanceStatus.ABSENT:
          counts.absent += count;
          break;
        case AttendanceStatus.LATE:
          counts.late += count;
          break;
        case AttendanceStatus.HALF_DAY:
          counts.halfDay += count;
          break;
        case AttendanceStatus.ON_LEAVE:
          counts.onLeave += count;
          break;
        default:
          break;
      }
    }

    const recordedDays =
      counts.present +
      counts.absent +
      counts.late +
      counts.halfDay +
      counts.onLeave;

    return {
      period,
      ...counts,
      attendancePercentage: attendancePercentage(counts),
      totalWorkingHours: minutesToHours(workingMinutes),
      lateMinutes,
      recordedDays,
    };
  }

  where(
    query: QueryAttendanceReportDto,
    start: Date,
    end: Date,
  ): Prisma.AttendanceWhereInput {
    return {
      date: { gte: start, lte: end },
      employeeId: query.employeeId,
      status: this.statusFilter(query.status),
      employee: {
        deletedAt: null,
        status: { not: EmployeeStatus.ARCHIVED },
      },
    };
  }

  private statusFilter(
    status?: QueryAttendanceReportDto['status'],
  ): Prisma.EnumAttendanceStatusFilter | undefined {
    if (!status) {
      return undefined;
    }

    if (
      status === AttendanceStatus.ON_LEAVE ||
      status === AttendanceStatus.ABSENT
    ) {
      return { in: storedStatusesForPublic(AttendanceStatus.ON_LEAVE) };
    }

    if (status === AttendanceStatus.PRESENT) {
      return { in: storedStatusesForPublic(AttendanceStatus.PRESENT) };
    }

    return { equals: status };
  }
}
