import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSettingKey, EmployeeStatus, Prisma } from '@prisma/client';
import { calendarDate } from '../attendance/working-hours';
import { AppConfiguration } from '../config/configuration';
import {
  addUtcDays,
  DEFAULT_DOCUMENT_WARNING_DAYS,
  resolveWarningDays,
} from '../documents/document-expiry';
import { toPublicDocumentType } from '../documents/documents.mapper';
import { parseOptionalDate } from '../common/utils/parse-date';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDocumentReportDto } from './dto/query-document-report.dto';
import { DocumentReportResponse } from './reports.types';

@Injectable()
export class DocumentReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async getReport(
    query: QueryDocumentReportDto,
  ): Promise<DocumentReportResponse> {
    const warningDays = await this.getWarningDays();
    const today = calendarDate();
    const soon = addUtcDays(today, warningDays);
    const where = this.where(query);

    const [total, expired, expiringSoon, typeRows] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.count({
        where: {
          ...where,
          expiryDate: { ...this.expiryFilter(query), lt: today },
        },
      }),
      this.prisma.document.count({
        where: {
          ...where,
          expiryDate: { ...this.expiryFilter(query), gte: today, lte: soon },
        },
      }),
      this.prisma.document.groupBy({
        by: ['documentType'],
        where,
        _count: { _all: true },
      }),
    ]);

    const typeExpired = await this.prisma.document.groupBy({
      by: ['documentType'],
      where: {
        ...where,
        expiryDate: { ...this.expiryFilter(query), lt: today },
      },
      _count: { _all: true },
    });
    const typeExpiring = await this.prisma.document.groupBy({
      by: ['documentType'],
      where: {
        ...where,
        expiryDate: { ...this.expiryFilter(query), gte: today, lte: soon },
      },
      _count: { _all: true },
    });

    const expiredByType = new Map<string, number>();
    for (const row of typeExpired) {
      const key = toPublicDocumentType(row.documentType);
      expiredByType.set(key, (expiredByType.get(key) ?? 0) + row._count._all);
    }
    const expiringByType = new Map<string, number>();
    for (const row of typeExpiring) {
      const key = toPublicDocumentType(row.documentType);
      expiringByType.set(key, (expiringByType.get(key) ?? 0) + row._count._all);
    }

    const byType = new Map<
      string,
      DocumentReportResponse['byDocumentType'][number]
    >();
    for (const row of typeRows) {
      const documentType = toPublicDocumentType(row.documentType);
      const current = byType.get(documentType) ?? {
        documentType,
        total: 0,
        valid: 0,
        expiringSoon: 0,
        expired: 0,
      };
      current.total += row._count._all;
      byType.set(documentType, current);
    }

    for (const item of byType.values()) {
      item.expired = expiredByType.get(item.documentType) ?? 0;
      item.expiringSoon = expiringByType.get(item.documentType) ?? 0;
      item.valid = Math.max(0, item.total - item.expired - item.expiringSoon);
    }

    const valid = Math.max(0, total - expired - expiringSoon);

    return {
      total,
      valid,
      expiringSoon,
      expired,
      warningDays,
      byDocumentType: [...byType.values()].sort((a, b) =>
        a.documentType.localeCompare(b.documentType),
      ),
    };
  }

  where(query: QueryDocumentReportDto): Prisma.DocumentWhereInput {
    return {
      employeeId: query.employeeId,
      documentType: query.documentType,
      expiryDate: this.expiryFilter(query),
      employee: {
        deletedAt: null,
        status: { not: EmployeeStatus.ARCHIVED },
      },
    };
  }

  private expiryFilter(
    query: QueryDocumentReportDto,
  ): Prisma.DateTimeNullableFilter | undefined {
    const from = parseOptionalDate(query.expiryFrom, 'expiryFrom');
    const to = parseOptionalDate(query.expiryTo, 'expiryTo');
    if (!from && !to) {
      return undefined;
    }

    return {
      gte: from ?? undefined,
      lte: to ?? undefined,
    };
  }

  async warningDays(): Promise<number> {
    return this.getWarningDays();
  }

  private async getWarningDays(): Promise<number> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: AppSettingKey.DOCUMENT_EXPIRY_WARNING_DAYS },
    });
    const fallback = this.config.get('documentExpiryWarningDays', {
      infer: true,
    });

    return resolveWarningDays(
      setting?.value,
      fallback || DEFAULT_DOCUMENT_WARNING_DAYS,
    );
  }
}
