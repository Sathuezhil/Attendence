export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vatNumber: string;
  logoUrl: string;
}

export interface WorkingHoursSettings {
  start: string;
  end: string;
  breakDurationMinutes: number;
  lateThresholdMinutes: number;
  halfDayMinutes: number;
  timezone: string;
  workingDays: number[];
}

export interface LeavePolicySettings {
  limits: Partial<Record<string, number>>;
}

export interface PayrollSettings {
  workingDaysPerMonth: number;
  overtimeEnabled: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  documentExpiry: boolean;
  leave: boolean;
  attendance: boolean;
  payroll: boolean;
  invoices: boolean;
}

export interface DocumentSettings {
  expiryWarningDays: number;
  expiryUrgentDays: number;
}

export interface AppSettings {
  company: CompanyProfile;
  workingHours: WorkingHoursSettings;
  leave: LeavePolicySettings;
  payroll: PayrollSettings;
  notifications: NotificationSettings;
  documents: DocumentSettings;
}

export type UpdateAppSettings = Partial<{
  company: Partial<CompanyProfile>;
  workingHours: Partial<WorkingHoursSettings>;
  leave: Partial<LeavePolicySettings>;
  payroll: Partial<PayrollSettings>;
  notifications: Partial<NotificationSettings>;
  documents: Partial<DocumentSettings>;
}>;
