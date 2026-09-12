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
  Prisma,
} from '@prisma/client';
import { parseOptionalDate } from '../common/utils/parse-date';
import { parseOptionalDateTime } from '../common/utils/parse-date-time';
import { PrismaService } from '../prisma/prisma.service';
import {
  toAttendanceResponse,
  toDayRow,
  toEmployeeSummary,
  toPublicStatus,
} from './attendance.mapper';
import {
  AttendanceResponse,
  AttendanceSummary,
  PaginatedAttendance,
  TodayAttendanceResponse,
} from './attendance.types';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
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
  department: true,
  jobTitle: true,
} satisfies Prisma.EmployeeSelect;

type AttendanceWithEmployee = Attendance & {
  employee: Pick<Employee, keyof typeof employeeSelect>;
};

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    const search = query.search?.trim().toLowerCase();

    const employees = await this.prisma.employee.findMany({
      where: {
        deletedAt: null,
        status: EmployeeStatus.ACTIVE,
        department: query.department
          ? { equals: query.department, mode: 'insensitive' }
          : undefined,
      },
      select: employeeSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const records = await this.prisma.attendance.findMany({
      where: {
        date,
        employeeId: { in: employees.map((employee) => employee.id) },
      },
      include: { employee: { select: employeeSelect } },
    });

    const byEmployee = new Map(
      records.map((record) => [record.employeeId, record]),
    );
    const attendanceDate = toDateOnly(date);

    let rows = employees.map((employee) =>
      toDayRow(
        toEmployeeSummary(employee),
        attendanceDate,
        byEmployee.get(employee.id),
      ),
    );

    if (search) {
      rows = rows.filter((row) => {
        const haystack = [
          row.employee.fullName,
          row.employee.employeeCode,
          row.employee.department,
          row.employee.jobTitle,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }

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
    const [totalEmployees, grouped] = await Promise.all([
      this.prisma.employee.count({
        where: { deletedAt: null, status: EmployeeStatus.ACTIVE },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date,
          employee: { deletedAt: null, status: EmployeeStatus.ACTIVE },
        },
        _count: { _all: true },
      }),
    ]);

    const counts = {
      present: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      storedAbsent: 0,
    };

    for (const row of grouped) {
      const count = row._count._all;
      switch (toPublicStatus(row.status)) {
        case AttendanceStatus.PRESENT:
          counts.present += count;
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
        case AttendanceStatus.HOLIDAY:
          counts.holiday += count;
          break;
        case AttendanceStatus.ABSENT:
          counts.storedAbsent += count;
          break;
        default:
          break;
      }
    }

    const accounted =
      counts.present +
      counts.late +
      counts.halfDay +
      counts.onLeave +
      counts.holiday +
      counts.storedAbsent;

    return {
      date: toDateOnly(date),
      totalEmployees,
      present: counts.present,
      late: counts.late,
      halfDay: counts.halfDay,
      onLeave: counts.onLeave,
      absent: Math.max(0, totalEmployees - accounted) + counts.storedAbsent,
    };
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

      return toAttendanceResponse(record);
    } catch (error) {
      this.rethrowKnownError(error);
    }
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

    const statusFilter =
      query.status === AttendanceStatus.ON_LEAVE
        ? { in: [AttendanceStatus.ON_LEAVE, AttendanceStatus.LEAVE] }
        : query.status;

    let date: Prisma.DateTimeFilter | Date | undefined;
    if (startDate || endDate) {
      date = {
        gte: startDate ?? undefined,
        lte: endDate ?? undefined,
      };
    } else if (exactDate) {
      date = exactDate;
    }

    return {
      employeeId: query.employeeId,
      date,
      status: statusFilter,
      employee: query.department
        ? {
            department: { equals: query.department, mode: 'insensitive' },
          }
        : undefined,
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
