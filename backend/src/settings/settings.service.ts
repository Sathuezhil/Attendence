import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSettingKey, Prisma } from '@prisma/client';
import { DEFAULT_WORKING_HOURS } from '../attendance/working-hours';
import { AppConfiguration } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  AppSettingsResponse,
  CompanyProfile,
  LeavePolicySettings,
  NotificationSettings,
  PayrollSettings,
  WorkingHoursSettings,
} from './settings.types';

const DEFAULT_LEAVE_LIMITS: Record<string, number> = {
  ANNUAL: 30,
  SICK: 15,
  UNPAID: 30,
  EMERGENCY: 5,
  OTHER: 5,
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async get(): Promise<AppSettingsResponse> {
    const keys: AppSettingKey[] = [
      AppSettingKey.COMPANY_PROFILE,
      AppSettingKey.ATTENDANCE_HOURS,
      AppSettingKey.LEAVE_POLICY,
      AppSettingKey.PAYROLL_WORKING_DAYS_PER_MONTH,
      AppSettingKey.NOTIFICATION_SETTINGS,
      AppSettingKey.DOCUMENT_EXPIRY_WARNING_DAYS,
      AppSettingKey.DOCUMENT_EXPIRY_URGENT_DAYS,
    ];
    const rows = await this.prisma.appSetting.findMany({
      where: { key: { in: keys } },
    });
    const map = new Map(rows.map((row) => [row.key, row.value]));

    return {
      company: this.parseCompany(map.get(AppSettingKey.COMPANY_PROFILE)),
      workingHours: this.parseWorkingHours(
        map.get(AppSettingKey.ATTENDANCE_HOURS),
      ),
      leave: this.parseLeave(map.get(AppSettingKey.LEAVE_POLICY)),
      payroll: this.parsePayroll(
        map.get(AppSettingKey.PAYROLL_WORKING_DAYS_PER_MONTH),
      ),
      notifications: this.parseNotifications(
        map.get(AppSettingKey.NOTIFICATION_SETTINGS),
      ),
      documents: {
        expiryWarningDays: this.parsePositiveInt(
          map.get(AppSettingKey.DOCUMENT_EXPIRY_WARNING_DAYS),
          this.config.get('documentExpiryWarningDays', { infer: true }) || 30,
        ),
        expiryUrgentDays: this.parsePositiveInt(
          map.get(AppSettingKey.DOCUMENT_EXPIRY_URGENT_DAYS),
          this.config.get('documentExpiryUrgentDays', { infer: true }) || 7,
        ),
      },
    };
  }

  async update(dto: UpdateSettingsDto): Promise<AppSettingsResponse> {
    const current = await this.get();
    await this.prisma.$transaction(async (tx) => {
      if (dto.company) {
        await this.upsert(tx, AppSettingKey.COMPANY_PROFILE, {
          ...current.company,
          ...this.cleanCompany(dto.company),
        });
      }
      if (dto.workingHours) {
        await this.upsert(tx, AppSettingKey.ATTENDANCE_HOURS, {
          ...current.workingHours,
          ...dto.workingHours,
        });
      }
      if (dto.leave) {
        await this.upsert(tx, AppSettingKey.LEAVE_POLICY, {
          limits: {
            ...current.leave.limits,
            ...(dto.leave.limits ?? {}),
          },
        });
      }
      if (dto.payroll) {
        const next = { ...current.payroll, ...dto.payroll };
        await this.upsert(
          tx,
          AppSettingKey.PAYROLL_WORKING_DAYS_PER_MONTH,
          next,
        );
      }
      if (dto.notifications) {
        await this.upsert(tx, AppSettingKey.NOTIFICATION_SETTINGS, {
          ...current.notifications,
          ...dto.notifications,
        });
      }
      if (dto.documents?.expiryWarningDays !== undefined) {
        await this.upsert(
          tx,
          AppSettingKey.DOCUMENT_EXPIRY_WARNING_DAYS,
          dto.documents.expiryWarningDays,
        );
      }
      if (dto.documents?.expiryUrgentDays !== undefined) {
        await this.upsert(
          tx,
          AppSettingKey.DOCUMENT_EXPIRY_URGENT_DAYS,
          dto.documents.expiryUrgentDays,
        );
      }
    });

    return this.get();
  }

  async getLeaveLimit(leaveType: string): Promise<number | undefined> {
    const settings = await this.get();
    return settings.leave.limits[leaveType];
  }

  async notificationsEnabled(
    channel: keyof Omit<NotificationSettings, 'enabled'>,
  ): Promise<boolean> {
    const settings = await this.get();
    return settings.notifications.enabled && settings.notifications[channel];
  }

  private async upsert(
    tx: Pick<PrismaService, 'appSetting'>,
    key: AppSettingKey,
    value: Prisma.InputJsonValue,
  ): Promise<void> {
    await tx.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  private parseCompany(value: Prisma.JsonValue | undefined): CompanyProfile {
    const env = this.config.get('company', { infer: true });
    const input = asRecord(value);
    return {
      name: stringOf(input.name, env.name ?? ''),
      address: stringOf(input.address, env.address ?? ''),
      phone: stringOf(input.phone, env.phone ?? ''),
      email: stringOf(input.email, env.email ?? ''),
      website: stringOf(input.website, ''),
      vatNumber: stringOf(input.vatNumber, ''),
      logoUrl: stringOf(input.logoUrl, ''),
    };
  }

  private parseWorkingHours(
    value: Prisma.JsonValue | undefined,
  ): WorkingHoursSettings {
    const input = asRecord(value);
    const days = Array.isArray(input.workingDays)
      ? input.workingDays.filter(
          (day): day is number =>
            typeof day === 'number' && day >= 0 && day <= 6,
        )
      : [1, 2, 3, 4, 5];
    return {
      start: stringOf(input.start, DEFAULT_WORKING_HOURS.start),
      end: stringOf(input.end, DEFAULT_WORKING_HOURS.end),
      breakDurationMinutes: this.parsePositiveInt(
        input.breakDurationMinutes,
        60,
      ),
      lateThresholdMinutes: this.parsePositiveInt(
        input.lateThresholdMinutes,
        DEFAULT_WORKING_HOURS.lateThresholdMinutes,
      ),
      halfDayMinutes: this.parsePositiveInt(
        input.halfDayMinutes,
        DEFAULT_WORKING_HOURS.halfDayMinutes,
      ),
      timezone: stringOf(input.timezone, DEFAULT_WORKING_HOURS.timezone),
      workingDays: days.length > 0 ? days : [1, 2, 3, 4, 5],
    };
  }

  private parseLeave(value: Prisma.JsonValue | undefined): LeavePolicySettings {
    const input = asRecord(value);
    const limits = asRecord(input.limits);
    const next: Record<string, number> = { ...DEFAULT_LEAVE_LIMITS };
    for (const [key, raw] of Object.entries(limits)) {
      if (typeof raw === 'number' && raw >= 0) {
        next[key] = Math.floor(raw);
      }
    }
    return { limits: next };
  }

  private parsePayroll(value: Prisma.JsonValue | undefined): PayrollSettings {
    const fallback = this.config.get('payrollWorkingDaysPerMonth', {
      infer: true,
    });
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const input = value as Record<string, unknown>;
      return {
        workingDaysPerMonth: this.parsePositiveInt(
          input.workingDaysPerMonth,
          fallback || 26,
        ),
        overtimeEnabled: input.overtimeEnabled !== false,
      };
    }
    return {
      workingDaysPerMonth: this.parsePositiveInt(value, fallback || 26),
      overtimeEnabled: true,
    };
  }

  private parseNotifications(
    value: Prisma.JsonValue | undefined,
  ): NotificationSettings {
    const input = asRecord(value);
    return {
      enabled: input.enabled !== false,
      documentExpiry: input.documentExpiry !== false,
      leave: input.leave !== false,
      attendance: input.attendance !== false,
      payroll: input.payroll !== false,
      invoices: input.invoices !== false,
    };
  }

  private parsePositiveInt(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'value' in value
    ) {
      return this.parsePositiveInt(value.value, fallback);
    }
    return fallback;
  }

  private cleanCompany(
    input: NonNullable<UpdateSettingsDto['company']>,
  ): Partial<CompanyProfile> {
    const next: Partial<CompanyProfile> = {};
    if (input.name !== undefined) next.name = input.name.trim();
    if (input.address !== undefined) next.address = input.address.trim();
    if (input.phone !== undefined) next.phone = input.phone.trim();
    if (input.email !== undefined) next.email = input.email.trim();
    if (input.website !== undefined) next.website = input.website.trim();
    if (input.vatNumber !== undefined) next.vatNumber = input.vatNumber.trim();
    if (input.logoUrl !== undefined) next.logoUrl = input.logoUrl.trim();
    return next;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringOf(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
