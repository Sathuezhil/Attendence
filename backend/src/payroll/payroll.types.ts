import { PayrollPaymentStatus } from '@prisma/client';

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'CANCELLED'] as const;

export interface PayrollEmployeeSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface PayrollResponse {
  id: string;
  employeeId: string;
  employee: PayrollEmployeeSummary;
  payrollMonth: number;
  payrollYear: number;
  basicSalary: number;
  allowances: number;
  overtimeAmount: number;
  deductions: number;
  unpaidLeaveDeduction: number;
  otherDeductions: number;
  unpaidLeaveDays: number;
  workingDaysPerMonth: number;
  dailyRate: number;
  grossSalary: number;
  netSalary: number;
  paymentStatus: PayrollPaymentStatus;
  paymentDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPayroll {
  data: PayrollResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PayrollPreview {
  employeeId: string;
  payrollMonth: number;
  payrollYear: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  workingDaysPerMonth: number;
  dailyRate: number;
  basicSalary: number;
  allowances: number;
  overtimeAmount: number;
  deductions: number;
  otherDeductions: number;
  grossSalary: number;
  netSalary: number;
}
