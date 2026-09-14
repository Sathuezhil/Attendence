import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Employee,
  EmployeeStatus,
  Leave,
  LeaveRequestStatus,
  LeaveType,
  Prisma,
} from '@prisma/client';
import { parseOptionalDate } from '../common/utils/parse-date';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationInboxService } from '../notifications/notification-inbox.service';
import { SettingsService } from '../settings/settings.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';
import { RejectLeaveDto } from './dto/reject-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { calculateTotalDays } from './leave-days';
import { toLeaveResponse } from './leave.mapper';
import { LeaveResponse, PaginatedLeave } from './leave.types';

const employeeSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
} satisfies Prisma.EmployeeSelect;

const REASON_REQUIRED: LeaveType[] = [
  LeaveType.SICK,
  LeaveType.EMERGENCY,
  LeaveType.OTHER,
];

type LeaveWithEmployee = Leave & {
  employee: Pick<Employee, keyof typeof employeeSelect>;
};

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inbox: NotificationInboxService,
    private readonly settings: SettingsService,
  ) {}

  async create(dto: CreateLeaveDto): Promise<LeaveResponse> {
    const employee = await this.findActiveEmployeeOrThrow(dto.employeeId);
    const { startDate, endDate } = this.parseRange(dto.startDate, dto.endDate);
    this.assertReason(dto.leaveType, dto.reason);
    await this.assertNoOverlap(employee.id, startDate, endDate);
    await this.assertWithinLimit(
      employee.id,
      dto.leaveType,
      calculateTotalDays(startDate, endDate),
    );

    const record = await this.prisma.leave.create({
      data: {
        employeeId: employee.id,
        leaveType: dto.leaveType,
        startDate,
        endDate,
        totalDays: calculateTotalDays(startDate, endDate),
        reason: dto.reason?.trim() ?? null,
        status: LeaveRequestStatus.PENDING,
      },
      include: { employee: { select: employeeSelect } },
    });

    return toLeaveResponse(record);
  }

  async findAll(query: QueryLeaveDto): Promise<PaginatedLeave> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [total, records] = await Promise.all([
      this.prisma.leave.count({ where }),
      this.prisma.leave.findMany({
        where,
        include: { employee: { select: employeeSelect } },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: records.map(toLeaveResponse),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findOne(id: string): Promise<LeaveResponse> {
    return toLeaveResponse(await this.findOrThrow(id));
  }

  async update(id: string, dto: UpdateLeaveDto): Promise<LeaveResponse> {
    const current = await this.findOrThrow(id);
    if (current.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending leave can be edited');
    }

    const startDate =
      parseOptionalDate(dto.startDate, 'startDate') ?? current.startDate;
    const endDate =
      parseOptionalDate(dto.endDate, 'endDate') ?? current.endDate;
    if (!startDate || !endDate) {
      throw new BadRequestException('Leave dates are required');
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate must not be before startDate');
    }

    const leaveType = dto.leaveType ?? current.leaveType;
    const reason = dto.reason ?? current.reason ?? undefined;
    this.assertReason(leaveType, reason);
    await this.assertNoOverlap(
      current.employeeId,
      startDate,
      endDate,
      current.id,
    );

    const record = await this.prisma.leave.update({
      where: { id: current.id },
      data: {
        leaveType,
        startDate,
        endDate,
        totalDays: calculateTotalDays(startDate, endDate),
        reason: dto.reason !== undefined ? dto.reason : current.reason,
      },
      include: { employee: { select: employeeSelect } },
    });

    return toLeaveResponse(record);
  }

  async approve(id: string, adminId: string): Promise<LeaveResponse> {
    const current = await this.requirePending(id);
    await this.assertNoOverlap(
      current.employeeId,
      current.startDate,
      current.endDate,
      current.id,
    );

    const record = await this.prisma.leave.update({
      where: { id: current.id },
      data: {
        status: LeaveRequestStatus.APPROVED,
        approvedById: adminId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
      include: { employee: { select: employeeSelect } },
    });

    await this.inbox.notify({
      type: 'LEAVE_APPROVED',
      title: 'Leave approved',
      message: `${record.employee.firstName} ${record.employee.lastName}'s leave was approved.`,
      employeeId: record.employeeId,
      eventKey: `leave-approved:${record.id}`,
    });

    return toLeaveResponse(record);
  }

  async reject(id: string, dto: RejectLeaveDto): Promise<LeaveResponse> {
    const current = await this.requirePending(id);
    const record = await this.prisma.leave.update({
      where: { id: current.id },
      data: {
        status: LeaveRequestStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
        approvedById: null,
        approvedAt: null,
      },
      include: { employee: { select: employeeSelect } },
    });

    await this.inbox.notify({
      type: 'LEAVE_REJECTED',
      title: 'Leave rejected',
      message: `${record.employee.firstName} ${record.employee.lastName}'s leave was rejected.`,
      employeeId: record.employeeId,
      eventKey: `leave-rejected:${record.id}`,
    });

    return toLeaveResponse(record);
  }

  async cancel(id: string): Promise<LeaveResponse> {
    const current = await this.findOrThrow(id);
    if (
      current.status !== LeaveRequestStatus.PENDING &&
      current.status !== LeaveRequestStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Only pending or approved leave can be cancelled',
      );
    }

    const record = await this.prisma.leave.update({
      where: { id: current.id },
      data: {
        status: LeaveRequestStatus.CANCELLED,
        approvedById: null,
        approvedAt: null,
      },
      include: { employee: { select: employeeSelect } },
    });

    return toLeaveResponse(record);
  }

  async getApprovedLeaveEmployeeIds(date: Date): Promise<Set<string>> {
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

  private async assertWithinLimit(
    employeeId: string,
    leaveType: LeaveType,
    requestedDays: number,
  ): Promise<void> {
    const limit = await this.settings.getLeaveLimit(leaveType);
    if (limit === undefined) {
      return;
    }

    const used = await this.prisma.leave.aggregate({
      where: {
        employeeId,
        leaveType,
        status: {
          in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED],
        },
      },
      _sum: { totalDays: true },
    });
    const already = used._sum.totalDays ?? 0;
    if (already + requestedDays > limit) {
      throw new BadRequestException(
        `${leaveType} leave exceeds the annual limit of ${limit} days`,
      );
    }
  }

  private async requirePending(id: string): Promise<LeaveWithEmployee> {
    const current = await this.findOrThrow(id);
    if (current.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Only pending leave can be updated');
    }

    return current;
  }

  private async findOrThrow(id: string): Promise<LeaveWithEmployee> {
    const record = await this.prisma.leave.findUnique({
      where: { id },
      include: { employee: { select: employeeSelect } },
    });

    if (!record) {
      throw new NotFoundException('Leave record not found');
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

  private parseRange(
    start: string,
    end: string,
  ): {
    startDate: Date;
    endDate: Date;
  } {
    const startDate = parseOptionalDate(start, 'startDate');
    const endDate = parseOptionalDate(end, 'endDate');
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate must not be before startDate');
    }

    return { startDate, endDate };
  }

  private assertReason(leaveType: LeaveType, reason?: string | null): void {
    if (!REASON_REQUIRED.includes(leaveType)) {
      return;
    }

    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException(`${leaveType} leave requires a reason`);
    }
  }

  private async assertNoOverlap(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<void> {
    const overlap = await this.prisma.leave.findFirst({
      where: {
        employeeId,
        id: excludeId ? { not: excludeId } : undefined,
        status: {
          in: [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED],
        },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlap) {
      throw new ConflictException(
        'This employee already has pending or approved leave that overlaps these dates',
      );
    }
  }

  private buildWhere(query: QueryLeaveDto): Prisma.LeaveWhereInput {
    const startDate = parseOptionalDate(query.startDate, 'startDate');
    const endDate = parseOptionalDate(query.endDate, 'endDate');
    const search = query.search?.trim();

    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate must not be before startDate');
    }

    const dateFilter =
      startDate || endDate
        ? {
            startDate: { lte: endDate ?? undefined },
            endDate: { gte: startDate ?? undefined },
          }
        : {};

    return {
      employeeId: query.employeeId,
      status: query.status,
      leaveType: query.leaveType,
      ...dateFilter,
      employee: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { employeeCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
    };
  }
}
