import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { toNotificationResponse } from './notifications.mapper';
import {
  NotificationResponse,
  PaginatedNotifications,
  UnreadCountResponse,
} from './notifications.types';

const notificationInclude = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
    },
  },
  document: {
    select: {
      id: true,
      documentType: true,
      expiryDate: true,
    },
  },
} satisfies Prisma.NotificationInclude;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryNotificationsDto): Promise<PaginatedNotifications> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationWhereInput = {
      type: query.type,
      isRead: query.unreadOnly ? false : undefined,
    };

    const [total, records] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        include: notificationInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: records.map((record) => toNotificationResponse(record)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async unreadCount(): Promise<UnreadCountResponse> {
    const count = await this.prisma.notification.count({
      where: { isRead: false },
    });
    return { count };
  }

  async markRead(id: string): Promise<NotificationResponse> {
    const current = await this.prisma.notification.findUnique({
      where: { id },
      include: notificationInclude,
    });

    if (!current) {
      throw new NotFoundException('Notification not found');
    }

    if (current.isRead) {
      return toNotificationResponse(current);
    }

    const record = await this.prisma.notification.update({
      where: { id: current.id },
      data: { isRead: true, readAt: new Date() },
      include: notificationInclude,
    });

    return toNotificationResponse(record);
  }

  async markAllRead(): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { count: result.count };
  }

  async remove(id: string): Promise<{ success: true }> {
    try {
      await this.prisma.notification.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Notification not found');
    }

    return { success: true };
  }
}
