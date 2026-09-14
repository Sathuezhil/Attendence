import {
  asDateOnly,
  asNumber,
  asString,
  listCollection,
  setRecord,
  todayUtc,
  updateRecord,
} from '@/lib/data';
import { AppSettings, CompanyProfile, UpdateAppSettings } from '@/features/settings/types';

const SETTING_KEYS = {
  company: 'COMPANY_PROFILE',
  workingHours: 'ATTENDANCE_HOURS',
  leave: 'LEAVE_POLICY',
  payroll: 'PAYROLL_WORKING_DAYS_PER_MONTH',
  notifications: 'NOTIFICATION_SETTINGS',
  warningDays: 'DOCUMENT_EXPIRY_WARNING_DAYS',
  urgentDays: 'DOCUMENT_EXPIRY_URGENT_DAYS',
} as const;

const DEFAULT_LEAVE_LIMITS: Record<string, number> = {
  ANNUAL: 30,
  SICK: 15,
  UNPAID: 30,
  EMERGENCY: 5,
  OTHER: 5,
};

export const DEFAULT_WORKING_HOURS = {
  start: '09:00',
  end: '18:00',
  lateThresholdMinutes: 15,
  halfDayMinutes: 240,
  timezone: 'UTC',
  breakDurationMinutes: 60,
  workingDays: [1, 2, 3, 4, 5],
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringOf(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    return parsePositiveInt((value as { value: unknown }).value, fallback);
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && 'days' in value) {
    return parsePositiveInt((value as { days: unknown }).days, fallback);
  }
  return fallback;
}

async function settingsMap(): Promise<Map<string, unknown>> {
  const rows = await listCollection('app_settings');
  const map = new Map<string, unknown>();
  for (const row of rows) {
    const key = asString(row.key) || row.id;
    map.set(key, row.value);
  }
  return map;
}

function parseCompany(value: unknown): CompanyProfile {
  const input = asRecord(value);
  return {
    name: stringOf(input.name, ''),
    address: stringOf(input.address, ''),
    phone: stringOf(input.phone, ''),
    email: stringOf(input.email, ''),
    website: stringOf(input.website, ''),
    vatNumber: stringOf(input.vatNumber, ''),
    logoUrl: stringOf(input.logoUrl, ''),
  };
}

export function parseWorkingHours(value: unknown) {
  const input = asRecord(value);
  const days = Array.isArray(input.workingDays)
    ? input.workingDays.filter(
        (day): day is number => typeof day === 'number' && day >= 0 && day <= 6,
      )
    : DEFAULT_WORKING_HOURS.workingDays;

  return {
    start:
      typeof input.start === 'string' && /^\d{2}:\d{2}$/.test(input.start)
        ? input.start
        : DEFAULT_WORKING_HOURS.start,
    end:
      typeof input.end === 'string' && /^\d{2}:\d{2}$/.test(input.end)
        ? input.end
        : DEFAULT_WORKING_HOURS.end,
    breakDurationMinutes: parsePositiveInt(
      input.breakDurationMinutes,
      DEFAULT_WORKING_HOURS.breakDurationMinutes,
    ),
    lateThresholdMinutes: parsePositiveInt(
      input.lateThresholdMinutes,
      DEFAULT_WORKING_HOURS.lateThresholdMinutes,
    ),
    halfDayMinutes: parsePositiveInt(input.halfDayMinutes, DEFAULT_WORKING_HOURS.halfDayMinutes),
    timezone: stringOf(input.timezone, DEFAULT_WORKING_HOURS.timezone),
    workingDays: days.length > 0 ? days : DEFAULT_WORKING_HOURS.workingDays,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const map = await settingsMap();
  const payrollValue = map.get(SETTING_KEYS.payroll);
  const payrollRecord = asRecord(payrollValue);

  return {
    company: parseCompany(map.get(SETTING_KEYS.company)),
    workingHours: parseWorkingHours(map.get(SETTING_KEYS.workingHours)),
    leave: {
      limits: {
        ...DEFAULT_LEAVE_LIMITS,
        ...Object.fromEntries(
          Object.entries(asRecord(asRecord(map.get(SETTING_KEYS.leave)).limits)).filter(
            (entry): entry is [string, number] =>
              typeof entry[1] === 'number' && Number.isFinite(entry[1]),
          ),
        ),
      },
    },
    payroll: {
      workingDaysPerMonth: parsePositiveInt(
        payrollRecord.workingDaysPerMonth ?? payrollValue,
        26,
      ),
      overtimeEnabled: payrollRecord.overtimeEnabled !== false,
    },
    notifications: {
      enabled: asRecord(map.get(SETTING_KEYS.notifications)).enabled !== false,
      documentExpiry: asRecord(map.get(SETTING_KEYS.notifications)).documentExpiry !== false,
      leave: asRecord(map.get(SETTING_KEYS.notifications)).leave !== false,
      attendance: asRecord(map.get(SETTING_KEYS.notifications)).attendance !== false,
      payroll: asRecord(map.get(SETTING_KEYS.notifications)).payroll !== false,
      invoices: asRecord(map.get(SETTING_KEYS.notifications)).invoices !== false,
    },
    documents: {
      expiryWarningDays: parsePositiveInt(map.get(SETTING_KEYS.warningDays), 30),
      expiryUrgentDays: parsePositiveInt(map.get(SETTING_KEYS.urgentDays), 7),
    },
  };
}

async function upsertSetting(key: string, value: unknown): Promise<void> {
  const rows = await listCollection('app_settings');
  const existing = rows.find((row) => asString(row.key) === key || row.id === key);
  if (existing) {
    await updateRecord('app_settings', existing.id, { key, value });
    return;
  }
  await setRecord('app_settings', key, { key, value, createdAt: new Date().toISOString() });
}

export async function saveSettings(payload: UpdateAppSettings): Promise<AppSettings> {
  const current = await loadSettings();
  if (payload.company) {
    await upsertSetting(SETTING_KEYS.company, { ...current.company, ...payload.company });
  }
  if (payload.workingHours) {
    await upsertSetting(SETTING_KEYS.workingHours, {
      ...current.workingHours,
      ...payload.workingHours,
    });
  }
  if (payload.leave) {
    await upsertSetting(SETTING_KEYS.leave, {
      limits: { ...current.leave.limits, ...(payload.leave.limits ?? {}) },
    });
  }
  if (payload.payroll) {
    await upsertSetting(SETTING_KEYS.payroll, { ...current.payroll, ...payload.payroll });
  }
  if (payload.notifications) {
    await upsertSetting(SETTING_KEYS.notifications, {
      ...current.notifications,
      ...payload.notifications,
    });
  }
  if (payload.documents?.expiryWarningDays !== undefined) {
    await upsertSetting(SETTING_KEYS.warningDays, payload.documents.expiryWarningDays);
  }
  if (payload.documents?.expiryUrgentDays !== undefined) {
    await upsertSetting(SETTING_KEYS.urgentDays, payload.documents.expiryUrgentDays);
  }
  return loadSettings();
}

export type WorkingHours = ReturnType<typeof parseWorkingHours>;

export function calendarDate(timezone = DEFAULT_WORKING_HOURS.timezone): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export function calculateAttendanceMetrics(
  checkIn: Date | null | undefined,
  checkOut: Date | null | undefined,
  attendanceDate: string,
  hours: WorkingHours,
): { lateMinutes: number; workingMinutes: number | null; status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' } {
  if (!checkIn) {
    return { lateMinutes: 0, workingMinutes: null, status: 'ABSENT' };
  }

  const [startHour, startMinute] = hours.start.split(':').map(Number);
  const start = new Date(`${attendanceDate}T00:00:00.000Z`);
  start.setUTCHours(startHour, startMinute, 0, 0);
  const lateMinutes = Math.max(0, Math.round((checkIn.getTime() - start.getTime()) / 60_000));

  let workingMinutes: number | null = null;
  if (checkOut) {
    let out = checkOut.getTime();
    if (out <= checkIn.getTime()) {
      out += 24 * 60 * 60 * 1000;
    }
    workingMinutes = Math.max(
      0,
      Math.round((out - checkIn.getTime()) / 60_000) - hours.breakDurationMinutes,
    );
  }

  return {
    lateMinutes,
    workingMinutes,
    status:
      workingMinutes !== null && workingMinutes < hours.halfDayMinutes ? 'HALF_DAY' : 'PRESENT',
  };
}

export function calculateExpiryStatus(
  expiryDate: string | null,
  warningDays: number,
  today = todayUtc(),
): 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY' {
  if (!expiryDate) {
    return 'NO_EXPIRY';
  }
  const days = daysUntil(expiryDate, today);
  if (days < 0) {
    return 'EXPIRED';
  }
  if (days <= warningDays) {
    return 'EXPIRING_SOON';
  }
  return 'VALID';
}

export function calculateExpiryAlert(
  expiryDate: string | null,
  warningDays: number,
  urgentDays: number,
  today = todayUtc(),
): 'VALID' | 'EXPIRING_SOON' | 'URGENT_EXPIRY' | 'EXPIRED' | 'NO_EXPIRY' {
  if (!expiryDate) {
    return 'NO_EXPIRY';
  }
  const days = daysUntil(expiryDate, today);
  if (days < 0) {
    return 'EXPIRED';
  }
  if (days <= urgentDays) {
    return 'URGENT_EXPIRY';
  }
  if (days <= warningDays) {
    return 'EXPIRING_SOON';
  }
  return 'VALID';
}

export function daysUntil(expiryDate: string, today = todayUtc()): number {
  const expiry = Date.parse(`${expiryDate}T00:00:00.000Z`);
  const current = Date.parse(`${today}T00:00:00.000Z`);
  return Math.round((expiry - current) / 86_400_000);
}

export function maskDocumentNumber(
  value: string | null | undefined,
  documentType: string,
): string | null {
  if (!value) {
    return null;
  }
  const sensitive = new Set([
    'PASSPORT',
    'VISA',
    'EMIRATES_ID',
    'WORK_PERMIT',
    'NATIONAL_ID',
    'PASSPORT_SCAN',
    'VISA_SCAN',
  ]);
  if (!sensitive.has(documentType)) {
    return value;
  }
  const compact = value.replaceAll(/\s+/g, '');
  if (compact.length <= 4) {
    return '****';
  }
  if (/^\d{3}-.+$/.test(compact)) {
    return `${compact.slice(0, 3)}-XXXX-XXXX-${compact.slice(-4)}`;
  }
  return `${compact.slice(0, 2)}${'*'.repeat(Math.max(4, compact.length - 6))}${compact.slice(-4)}`;
}

export function toPublicDocumentType(type: string): string {
  const legacy: Record<string, string> = {
    PASSPORT_SCAN: 'PASSPORT',
    VISA_SCAN: 'VISA',
    NATIONAL_ID: 'EMIRATES_ID',
    CONTRACT: 'LABOUR_CONTRACT',
  };
  return legacy[type] ?? type;
}

export const DEFAULT_WORKING_DAYS_PER_MONTH = 26;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePayroll(input: {
  basicSalary: number;
  allowances: number;
  overtimeAmount: number;
  deductions: number;
  otherDeductions: number;
  unpaidLeaveDays: number;
  workingDaysPerMonth: number;
}) {
  const basicSalary = roundMoney(input.basicSalary);
  const allowances = roundMoney(input.allowances);
  const overtimeAmount = roundMoney(input.overtimeAmount);
  const deductions = roundMoney(input.deductions);
  const otherDeductions = roundMoney(input.otherDeductions);
  const unpaidLeaveDays = Math.max(0, Math.floor(input.unpaidLeaveDays));
  const workingDaysPerMonth = Math.max(1, Math.floor(input.workingDaysPerMonth));
  const dailyRate = roundMoney(basicSalary / workingDaysPerMonth);
  const unpaidLeaveDeduction = roundMoney(dailyRate * unpaidLeaveDays);
  const grossSalary = roundMoney(basicSalary + allowances + overtimeAmount);
  const netSalary = roundMoney(
    Math.max(0, grossSalary - deductions - unpaidLeaveDeduction - otherDeductions),
  );

  return {
    basicSalary,
    allowances,
    overtimeAmount,
    deductions,
    otherDeductions,
    unpaidLeaveDays,
    unpaidLeaveDeduction,
    workingDaysPerMonth,
    dailyRate,
    grossSalary,
    netSalary,
  };
}

export function monthDateRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function overlappingDays(startA: string, endA: string, startB: string, endB: string): number {
  const start = Math.max(
    Date.parse(`${startA}T00:00:00.000Z`),
    Date.parse(`${startB}T00:00:00.000Z`),
  );
  const end = Math.min(Date.parse(`${endA}T00:00:00.000Z`), Date.parse(`${endB}T00:00:00.000Z`));
  if (end < start) {
    return 0;
  }
  return Math.round((end - start) / 86_400_000) + 1;
}

export function asDateOnlyOrToday(value: unknown): string {
  return asDateOnly(value) ?? todayUtc();
}

export function asNum(value: unknown): number {
  return asNumber(value, 0);
}
