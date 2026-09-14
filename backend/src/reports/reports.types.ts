import { ReportPeriod } from './report-period';

export interface NamedAmount {
  key: string;
  label: string;
  amount: number;
}

export interface EmployeeReportResponse {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  terminated: number;
}

export interface AttendanceReportResponse {
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

export interface LeaveReportResponse {
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

export interface PayrollReportResponse {
  totalPayroll: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paidAmount: number;
  pendingAmount: number;
  monthlyTrend: PayrollMonthPoint[];
}

export interface InvoiceReportResponse {
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

export interface DocumentReportResponse {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  warningDays: number;
  byDocumentType: DocumentTypeBreakdown[];
}
