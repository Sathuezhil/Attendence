import { apiRequest } from '@/lib/api';
import {
  AttendanceReport,
  DocumentReport,
  EmployeeReport,
  InvoiceReport,
  LeaveReport,
  PayrollReport,
} from './types';

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function fetchEmployeeReport(params: Record<string, string | undefined> = {}) {
  return apiRequest<EmployeeReport>(`/reports/employees${toQuery(params)}`);
}

export function fetchAttendanceReport(params: Record<string, string | undefined> = {}) {
  return apiRequest<AttendanceReport>(`/reports/attendance${toQuery(params)}`);
}

export function fetchLeaveReport(params: Record<string, string | number | undefined> = {}) {
  return apiRequest<LeaveReport>(`/reports/leave${toQuery(params)}`);
}

export function fetchPayrollReport(params: Record<string, string | number | undefined> = {}) {
  return apiRequest<PayrollReport>(`/reports/payroll${toQuery(params)}`);
}

export function fetchInvoiceReport(params: Record<string, string | undefined> = {}) {
  return apiRequest<InvoiceReport>(`/reports/invoices${toQuery(params)}`);
}

export function fetchDocumentReport(params: Record<string, string | undefined> = {}) {
  return apiRequest<DocumentReport>(`/reports/documents${toQuery(params)}`);
}
