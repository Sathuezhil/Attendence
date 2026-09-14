import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import {
  AppSettingKey,
  Attendance,
  AttendanceStatus,
  Employee,
  EmployeeStatus,
  LeaveRequestStatus,
  Prisma,
} from '@prisma/client';
import { parseOptionalDate } from '../common/utils/parse-date';
import { parseOptionalDateTime } from '../common/utils/parse-date-time';
import { NotificationInboxService } from '../notifications/notification-inbox.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  toAttendanceResponse,
  toDayRow,
  toEmployeeSummary,
  toPublicStatus,
  storedStatusesForPublic,
} from './attendance.mapper';
import {
  AttendanceResponse,
  AttendanceSummary,
  PaginatedAttendance,
  TodayAttendanceResponse,
} from './attendance.types';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { MarkDayDto } from './dto/mark-day.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { QueryTodayAttendanceDto } from './dto/query-today-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import {
  AttendanceMetrics,
  WorkingHours,
  calculateAttendanceMetrics,
  calendarDate,
  parseWorkingHours,
  toDateOnly,
} from './working-hours';

const employeeSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
} satisfies Prisma.EmployeeSelect;

type AttendanceWithEmployee = Attendance & {
  employee: Pick<Employee, keyof typeof employeeSelect>;
};

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inbox?: NotificationInboxService,
  ) {}

  async getWorkingHours(): Promise<WorkingHours> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: AppSettingKey.ATTENDANCE_HOURS },
    });

    return parseWorkingHours(setting?.value);
  }

  async getToday(
    query: QueryTodayAttendanceDto,
  ): Promise<TodayAttendanceResponse> {
    const hours = await this.getWorkingHours();
    const date = this.resolveDate(query.date, hours);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const search = query.search?.trim();

    const employees = await this.prisma.employee.findMany({
      where: {
        deletedAt: null,
        status: EmployeeStatus.ACTIVE,
        ...(query.employeeId ? { id: query.employeeId } : {}),
        OR: search
          ? [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeCode: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: employeeSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const [records, leaveIds] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          date,
          employeeId: { in: employees.map((employee) => employee.id) },
        },
        include: { employee: { select: employeeSelect } },
      }),
      this.getApprovedLeaveEmployeeIds(date),
    ]);

    const byEmployee = new Map(
      records.map((record) => [record.employeeId, record]),
    );
    const attendanceDate = toDateOnly(date);

    let rows = employees.map((employee) => {
      const row = toDayRow(
        toEmployeeSummary(employee),
        attendanceDate,
        byEmployee.get(employee.id),
      );

      if (leaveIds.has(employee.id) && row.virtual) {
        return {
          ...row,
          status: AttendanceStatus.ON_LEAVE,
        };
      }

      return row;
    });

    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }

    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    return {
      summary: await this.getSummaryCounts(date),
      hours,
      data: paged,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async getSummaryCounts(date: Date): Promise<AttendanceSummary> {
    const [totalEmployees, attendanceRows] = await Promise.all([
      this.prisma.employee.count({
        where: { deletedAt: null, status: EmployeeStatus.ACTIVE },
      }),
      this.prisma.attendance.findMany({
        where: {
          date,
          employee: { deletedAt: null, status: EmployeeStatus.ACTIVE },
        },
        select: { employeeId: true, status: true },
      }),
    ]);

    const counts = {
      present: 0,
      halfDay: 0,
      holiday: 0,
    };

    for (const row of attendanceRows) {
      switch (toPublicStatus(row.status)) {
        case AttendanceStatus.PRESENT:
          counts.present += 1;
          break;
        case AttendanceStatus.HALF_DAY:
          counts.halfDay += 1;
          break;
        case AttendanceStatus.HOLIDAY:
          counts.holiday += 1;
          break;
        default:
          break;
      }
    }

    const accounted = counts.present + counts.halfDay + counts.holiday;
    const onLeave = Math.max(0, totalEmployees - accounted);

    return {
      date: toDateOnly(date),
      totalEmployees,
      present: counts.present,
      late: 0,
      halfDay: counts.halfDay,
      onLeave,
      absent: 0,
    };
  }

  private async getApprovedLeaveEmployeeIds(date: Date): Promise<Set<string>> {
    const rows = await this.prisma.leave.findMany({
      where: {
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: date },
        endDate: { gte: date },
        employee: { deletedAt: null, status: EmployeeStatus.ACTIVE },
      },
      select: { employeeId: true },
    });

    return new Set(rows.map((row) => row.employeeId));
  }

  async findAll(query: QueryAttendanceDto): Promise<PaginatedAttendance> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildHistoryWhere(query);

    const [total, records] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({
        where,
        include: { employee: { select: employeeSelect } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: records.map(toAttendanceResponse),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findOne(id: string): Promise<AttendanceResponse> {
    return toAttendanceResponse(await this.findRecordOrThrow(id));
  }

  async checkIn(dto: CheckInDto): Promise<AttendanceResponse> {
    const employee = await this.findActiveEmployeeOrThrow(dto.employeeId);
    const hours = await this.getWorkingHours();
    const date = calendarDate(hours.timezone);
    const checkIn =
      parseOptionalDateTime(dto.checkIn, 'checkIn', date) ?? new Date();
    const metrics = calculateAttendanceMetrics(checkIn, null, date, hours);

    try {
      const record = await this.prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date,
          checkIn,
          status: metrics.status,
          lateMinutes: metrics.lateMinutes,
          workingMinutes: metrics.workingMinutes,
          source: 'MANUAL',
        },
        include: { employee: { select: employeeSelect } },
      });

      if (metrics.lateMinutes > hours.lateThresholdMinutes) {
        await this.inbox?.notify({
          type: 'ATTENDANCE_ALERT',
          title: 'Late check-in',
          message: `${employee.firstName} ${employee.lastName} checked in late.`,
          employeeId: employee.id,
          eventKey: `attendance-late:${record.id}`,
        });
      }

      return toAttendanceResponse(record);
    } catch (error) {
      this.rethrowKnownError(error);
    }
  }

  async markDay(dto: MarkDayDto): Promise<AttendanceResponse> {
    const employee = await this.findActiveEmployeeOrThrow(dto.employeeId);
    const hours = await this.getWorkingHours();
    const date = calendarDate(hours.timezone);
    const clearsTimes =
      dto.status === AttendanceStatus.ON_LEAVE ||
      dto.status === AttendanceStatus.HOLIDAY ||
      dto.status === AttendanceStatus.ABSENT;

    const record = await this.prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date,
        },
      },
      create: {
        employeeId: employee.id,
        date,
        status: dto.status,
        source: 'MANUAL',
        checkIn: null,
        checkOut: null,
        lateMinutes: null,
        workingMinutes: null,
      },
      update: {
        status: dto.status,
        ...(clearsTimes
          ? {
              checkIn: null,
              checkOut: null,
              lateMinutes: null,
              workingMinutes: null,
            }
          : {}),
      },
      include: { employee: { select: employeeSelect } },
    });

    return toAttendanceResponse(record);
  }

  async checkOut(id: string, dto: CheckOutDto): Promise<AttendanceResponse> {
    const record = await this.findRecordOrThrow(id);
    const hours = await this.getWorkingHours();

    if (!record.checkIn) {
      throw new BadRequestException('Check-in is required before check-out');
    }

    if (record.checkOut) {
      throw new ConflictException('Check-out has already been recorded');
    }

    const checkOut =
      parseOptionalDateTime(dto.checkOut, 'checkOut', record.date) ??
      new Date();
    this.assertCheckOutAfterCheckIn(record.checkIn, checkOut);

    const metrics = calculateAttendanceMetrics(
      record.checkIn,
      checkOut,
      record.date,
      hours,
    );

    const updated = await this.prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOut,
        status: this.preserveManualStatus(record.status, metrics),
        lateMinutes: metrics.lateMinutes,
        workingMinutes: metrics.workingMinutes,
      },
      include: { employee: { select: employeeSelect } },
    });

    return toAttendanceResponse(updated);
  }

  async update(
    id: string,
    dto: UpdateAttendanceDto,
  ): Promise<AttendanceResponse> {
    const record = await this.findRecordOrThrow(id);
    const hours = await this.getWorkingHours();
    const checkIn = Object.prototype.hasOwnProperty.call(dto, 'checkIn')
      ? (parseOptionalDateTime(dto.checkIn, 'checkIn', record.date) ?? null)
      : record.checkIn;
    const checkOut = Object.prototype.hasOwnProperty.call(dto, 'checkOut')
      ? (parseOptionalDateTime(dto.checkOut, 'checkOut', record.date) ?? null)
      : record.checkOut;

    if (checkIn && checkOut) {
      this.assertCheckOutAfterCheckIn(checkIn, checkOut);
    }

    if (checkOut && !checkIn) {
      throw new BadRequestException('Check-in is required before check-out');
    }

    const metrics = calculateAttendanceMetrics(
      checkIn,
      checkOut,
      record.date,
      hours,
    );
    const nextStatus = dto.status
      ? dto.status
      : this.preserveManualStatus(record.status, metrics);

    const updated = await this.prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkIn,
        checkOut,
        status: nextStatus,
        lateMinutes: checkIn ? metrics.lateMinutes : null,
        workingMinutes: metrics.workingMinutes,
        notes: dto.notes,
      },
      include: { employee: { select: employeeSelect } },
    });

    return toAttendanceResponse(updated);
  }

  refuseDelete(): never {
    throw new MethodNotAllowedException(
      'Attendance records cannot be permanently deleted',
    );
  }

  private preserveManualStatus(
    current: AttendanceStatus,
    metrics: AttendanceMetrics,
  ): AttendanceStatus {
    const publicStatus = toPublicStatus(current);
    if (
      publicStatus === AttendanceStatus.ON_LEAVE ||
      publicStatus === AttendanceStatus.HOLIDAY ||
      publicStatus === AttendanceStatus.ABSENT
    ) {
      return publicStatus;
    }

    return metrics.status;
  }

  private async findRecordOrThrow(id: string): Promise<AttendanceWithEmployee> {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
      include: { employee: { select: employeeSelect } },
    });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    return record;
  }

  private async findActiveEmployeeOrThrow(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Employee is not active');
    }

    return employee;
  }

  private resolveDate(value: string | undefined, hours: WorkingHours): Date {
    const parsed = parseOptionalDate(value, 'date');
    if (parsed === undefined) {
      return calendarDate(hours.timezone);
    }

    if (parsed === null) {
      throw new BadRequestException('date must be a valid date');
    }

    return parsed;
  }

  private buildHistoryWhere(
    query: QueryAttendanceDto,
  ): Prisma.AttendanceWhereInput {
    const exactDate = parseOptionalDate(query.date, 'date');
    const startDate = parseOptionalDate(query.startDate, 'startDate');
    const endDate = parseOptionalDate(query.endDate, 'endDate');

    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    if (query.lateOnly && query.absentOnly) {
      throw new BadRequestException(
        'lateOnly and absentOnly cannot be combined',
      );
    }

    const forcedStatus = query.lateOnly
      ? AttendanceStatus.LATE
      : query.absentOnly
        ? AttendanceStatus.ON_LEAVE
        : query.status;

    const statusFilter = forcedStatus
      ? { in: storedStatusesForPublic(forcedStatus) }
      : undefined;

    let date: Prisma.DateTimeFilter | Date | undefined;
    if (startDate || endDate) {
      date = {
        gte: startDate ?? undefined,
        lte: endDate ?? undefined,
      };
    } else if (exactDate) {
      date = exactDate;
    }

    const search = query.search?.trim();

    return {
      employeeId: query.employeeId,
      date,
      status: statusFilter,
      employee: {
        OR: search
          ? [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeCode: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
    };
  }

  private assertCheckOutAfterCheckIn(checkIn: Date, checkOut: Date): void {
    if (checkOut.getTime() <= checkIn.getTime()) {
      throw new BadRequestException('checkOut must be after checkIn');
    }
  }

  private rethrowKnownError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'This employee already has an attendance record for today',
      );
    }

    this.logger.error('Unexpected attendance persistence error', error);
    throw new BadRequestException('Unable to save attendance');
  }
}
