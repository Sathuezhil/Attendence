import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSettingKey, Prisma } from '@prisma/client';
import { calendarDate, toDateOnly } from '../attendance/working-hours';
import { AppConfiguration } from '../config/configuration';
import {
  addUtcDays,
  calculateExpiryAlert,
  DEFAULT_DOCUMENT_URGENT_DAYS,
  DEFAULT_DOCUMENT_WARNING_DAYS,
  ExpiryThresholds,
  normalizeExpiryThresholds,
  resolveWarningDays,
} from '../documents/document-expiry';
import { toPublicDocumentType } from '../documents/documents.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { buildExpiryNotificationDrafts } from './expiry-notification.factory';
import { ExpiryAlertItem, ExpiryAlertsResponse } from './notifications.types';

const documentSelect = {
  id: true,
  employeeId: true,
  documentType: true,
  expiryDate: true,
  employee: {
    select: {
      firstName: true,
      lastName: true,
      employeeCode: true,
    },
  },
} satisfies Prisma.DocumentSelect;

@Injectable()
export class DocumentExpiryService {
  private readonly logger = new Logger(DocumentExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly settings: SettingsService,
  ) {}

  async getThresholds(): Promise<ExpiryThresholds> {
    const [warningSetting, urgentSetting] = await Promise.all([
      this.prisma.appSetting.findUnique({
        where: { key: AppSettingKey.DOCUMENT_EXPIRY_WARNING_DAYS },
      }),
      this.prisma.appSetting.findUnique({
        where: { key: AppSettingKey.DOCUMENT_EXPIRY_URGENT_DAYS },
      }),
    ]);

    return normalizeExpiryThresholds(
      resolveWarningDays(
        warningSetting?.value,
        this.config.get('documentExpiryWarningDays', { infer: true }) ||
          DEFAULT_DOCUMENT_WARNING_DAYS,
      ),
      resolveWarningDays(
        urgentSetting?.value,
        this.config.get('documentExpiryUrgentDays', { infer: true }) ||
          DEFAULT_DOCUMENT_URGENT_DAYS,
      ),
    );
  }

  async runDailyCheck(): Promise<{ created: number; examined: number }> {
    const thresholds = await this.getThresholds();
    const today = calendarDate();
    const warningUntil = addUtcDays(today, thresholds.warningDays);

    const documents = await this.prisma.document.findMany({
      where: {
        expiryDate: { not: null, lte: warningUntil },
        employee: { deletedAt: null },
      },
      select: documentSelect,
    });

    const drafts = buildExpiryNotificationDrafts(
      documents
        .filter(
          (document): document is typeof document & { expiryDate: Date } =>
            document.expiryDate !== null,
        )
        .map((document) => ({
          id: document.id,
          employeeId: document.employeeId,
          documentType: document.documentType,
          expiryDate: document.expiryDate,
          employee: document.employee,
        })),
      today,
      thresholds,
    );

    if (drafts.length === 0) {
      this.logger.log(
        `Document expiry check examined ${documents.length} document(s); no notifications to create`,
      );
      return { created: 0, examined: documents.length };
    }

    if (!(await this.settings.notificationsEnabled('documentExpiry'))) {
      this.logger.log(
        `Document expiry check examined ${documents.length} document(s); notifications disabled`,
      );
      return { created: 0, examined: documents.length };
    }

    const result = await this.prisma.notification.createMany({
      data: drafts.map((draft) => ({
        type: draft.type,
        title: draft.title,
        message: draft.message,
        employeeId: draft.employeeId,
        documentId: draft.documentId,
        eventKey: draft.eventKey,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Document expiry check examined ${documents.length} document(s) and created ${result.count} notification(s)`,
    );

    return { created: result.count, examined: documents.length };
  }

  async getExpiryAlerts(): Promise<ExpiryAlertsResponse> {
    const thresholds = await this.getThresholds();
    const today = calendarDate();
    const warningUntil = addUtcDays(today, thresholds.warningDays);

    const documents = await this.prisma.document.findMany({
      where: {
        expiryDate: { not: null, lte: warningUntil },
        employee: { deletedAt: null },
      },
      select: documentSelect,
      orderBy: { expiryDate: 'asc' },
      take: 150,
    });

    const expired: ExpiryAlertItem[] = [];
    const expiringUrgent: ExpiryAlertItem[] = [];
    const expiringSoon: ExpiryAlertItem[] = [];

    for (const document of documents) {
      if (!document.expiryDate) {
        continue;
      }

      const bucket = calculateExpiryAlert(
        document.expiryDate,
        today,
        thresholds,
      );
      const item: ExpiryAlertItem = {
        documentId: document.id,
        employeeId: document.employeeId,
        employeeName:
          `${document.employee.firstName} ${document.employee.lastName}`.trim(),
        employeeCode: document.employee.employeeCode,
        documentType: toPublicDocumentType(document.documentType),
        expiryDate: toDateOnly(document.expiryDate),
        bucket,
      };

      if (bucket === 'EXPIRED' && expired.length < 20) {
        expired.push(item);
      } else if (bucket === 'URGENT_EXPIRY' && expiringUrgent.length < 20) {
        expiringUrgent.push(item);
      } else if (bucket === 'EXPIRING_SOON' && expiringSoon.length < 20) {
        expiringSoon.push(item);
      }
    }

    return {
      expired,
      expiringUrgent,
      expiringSoon,
      urgentDays: thresholds.urgentDays,
      warningDays: thresholds.warningDays,
    };
  }
}
