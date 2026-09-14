import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { calendarDate } from '../attendance/working-hours';
import { DocumentsService } from '../documents/documents.service';
import { DocumentExpiryService } from '../notifications/document-expiry.service';
import { ExpiryAlertsResponse } from '../notifications/notifications.types';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import {
  DashboardActivityDto,
  RecentActivityResponseDto,
} from './dto/recent-activity.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly documentsService: DocumentsService,
    private readonly documentExpiryService: DocumentExpiryService,
  ) {}

  async getSummary(): Promise<DashboardSummaryDto> {
    try {
      const hours = await this.attendanceService.getWorkingHours();
      const today = calendarDate(hours.timezone);

      const [employees, attendance, documents] = await Promise.all([
        this.prisma.employee.count({
          where: { deletedAt: null },
        }),
        this.attendanceService.getSummaryCounts(today),
        this.documentsService.getExpirySummary(),
      ]);

      return {
        employees,
        activeEmployees: attendance.totalEmployees,
        onLeaveToday: attendance.onLeave,
        presentToday: attendance.present,
        absentToday: attendance.absent,
        lateToday: attendance.late,
        documentsExpired: documents.expired,
        documentsExpiringSoon: documents.expiringSoon,
      };
    } catch (error) {
      this.logger.error('Failed to load dashboard summary', error);
      throw new ServiceUnavailableException('Unable to load dashboard summary');
    }
  }

  async getExpiryAlerts(): Promise<ExpiryAlertsResponse> {
    try {
      return await this.documentExpiryService.getExpiryAlerts();
    } catch (error) {
      this.logger.error('Failed to load expiry alerts', error);
      throw new ServiceUnavailableException('Unable to load expiry alerts');
    }
  }

  async getRecentActivity(): Promise<RecentActivityResponseDto> {
    try {
      const rows = await this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          action: true,
          entityType: true,
          createdAt: true,
        },
      });

      return {
        activities: rows.map((row): DashboardActivityDto => ({
          id: row.id,
          type: row.action,
          description: describeActivity(row.action, row.entityType),
          occurredAt: row.createdAt.toISOString(),
        })),
      };
    } catch (error) {
      this.logger.error('Failed to load recent activity', error);
      throw new ServiceUnavailableException('Unable to load recent activity');
    }
  }
}

function describeActivity(action: string, entityType: string): string {
  const readableAction = action.replaceAll(/[_-]+/g, ' ').trim();
  const readableEntity = entityType.replaceAll(/[_-]+/g, ' ').trim();

  if (!readableAction) {
    return readableEntity || 'Activity recorded';
  }

  if (!readableEntity) {
    return readableAction;
  }

  return `${readableAction} · ${readableEntity}`;
}
