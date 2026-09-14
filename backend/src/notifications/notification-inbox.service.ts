import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationDraft } from './notification-channel';
import { NotificationSettings } from '../settings/settings.types';

const CHANNEL_BY_TYPE: Record<
  string,
  keyof Omit<NotificationSettings, 'enabled'>
> = {
  DOCUMENT_EXPIRING: 'documentExpiry',
  DOCUMENT_EXPIRED: 'documentExpiry',
  LEAVE_APPROVED: 'leave',
  LEAVE_REJECTED: 'leave',
  ATTENDANCE_ALERT: 'attendance',
  PAYROLL_CREATED: 'payroll',
  INVOICE_OVERDUE: 'invoices',
  SYSTEM: 'documentExpiry',
};

@Injectable()
export class NotificationInboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async notify(draft: NotificationDraft): Promise<void> {
    if (draft.type === 'SYSTEM') {
      const settings = await this.settings.get();
      if (!settings.notifications.enabled) {
        return;
      }
    } else {
      const channel = CHANNEL_BY_TYPE[draft.type] ?? 'documentExpiry';
      if (!(await this.settings.notificationsEnabled(channel))) {
        return;
      }
    }

    await this.prisma.notification.upsert({
      where: { eventKey: draft.eventKey },
      create: {
        type: draft.type,
        title: draft.title,
        message: draft.message,
        employeeId: draft.employeeId ?? null,
        documentId: draft.documentId ?? null,
        eventKey: draft.eventKey,
      },
      update: {},
    });
  }
}
