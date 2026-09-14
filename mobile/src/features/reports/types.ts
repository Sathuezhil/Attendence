export interface ReportPeriod {
  startDate: string;
  endDate: string;
}

export interface EmployeeReport {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  terminated: number;
}

export interface AttendanceReport {
  period: ReportPeriod;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  attendancePercentage: number;
  totalWorkingHours: number;
  lateMinutes: number;
  recordedDays: number;
}

export interface LeaveTypeDays {
  leaveType: string;
  requests: number;
  days: number;
}

export interface LeaveEmployeeSummary {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  requests: number;
  days: number;
}

export interface LeaveReport {
  period: ReportPeriod;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  cancelled: number;
  daysByLeaveType: LeaveTypeDays[];
  employeeSummaries: LeaveEmployeeSummary[];
  page: number;
  limit: number;
  totalEmployees: number;
  totalPages: number;
}

export interface PayrollMonthPoint {
  year: number;
  month: number;
  grossSalary: number;
  netSalary: number;
}

export interface PayrollReport {
  totalPayroll: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paidAmount: number;
  pendingAmount: number;
  monthlyTrend: PayrollMonthPoint[];
}

export interface InvoiceReport {
  period: ReportPeriod;
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  cancelled: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  outstandingAmount: number;
}

export interface DocumentTypeBreakdown {
  documentType: string;
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
}

export interface DocumentReport {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  warningDays: number;
  byDocumentType: DocumentTypeBreakdown[];
}

export const EMPLOYMENT_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'] as const;
export const ATTENDANCE_STATUSES = ['PRESENT', 'ON_LEAVE', 'HALF_DAY', 'HOLIDAY'] as const;
export const LEAVE_TYPES = ['ANNUAL', 'SICK', 'UNPAID', 'EMERGENCY', 'OTHER'] as const;
export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;
export const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
] as const;
export const DOCUMENT_TYPES = [
  'PASSPORT',
  'VISA',
  'EMIRATES_ID',
  'WORK_PERMIT',
  'LABOUR_CONTRACT',
  'INSURANCE',
  'OTHER',
] as const;
