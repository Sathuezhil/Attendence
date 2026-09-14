import { apiRequest } from '@/lib/api';
import {
  PaginatedPayroll,
  PaymentStatus,
  PayrollPreview,
  PayrollRecord,
  PayrollWritePayload,
} from './types';

export interface PayrollListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  month?: number;
  year?: number;
  paymentStatus?: PaymentStatus;
}

function toQuery(params: PayrollListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function fetchPayroll(params: PayrollListParams = {}): Promise<PaginatedPayroll> {
  return apiRequest<PaginatedPayroll>(`/payroll${toQuery(params)}`);
}

export function fetchEmployeePayroll(employeeId: string): Promise<PayrollRecord[]> {
  return apiRequest<PayrollRecord[]>(`/employees/${employeeId}/payroll`);
}

export function fetchPayrollRecord(id: string): Promise<PayrollRecord> {
  return apiRequest<PayrollRecord>(`/payroll/${id}`);
}

export function previewPayroll(payload: PayrollWritePayload): Promise<PayrollPreview> {
  return apiRequest<PayrollPreview>('/payroll/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createPayroll(payload: PayrollWritePayload): Promise<PayrollRecord> {
  return apiRequest<PayrollRecord>('/payroll', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function markPayrollPaid(id: string): Promise<PayrollRecord> {
  return apiRequest<PayrollRecord>(`/payroll/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function cancelPayroll(id: string): Promise<PayrollRecord> {
  return apiRequest<PayrollRecord>(`/payroll/${id}`, {
    method: 'DELETE',
  });
}
