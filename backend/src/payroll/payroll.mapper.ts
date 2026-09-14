import { Employee, PayrollRecord } from '@prisma/client';
import { toDateOnly } from '../attendance/working-hours';
import { PayrollCalculation } from './payroll-calculation';
import { PayrollEmployeeSummary, PayrollResponse } from './payroll.types';

type PayrollWithEmployee = PayrollRecord & {
  employee: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName'>;
};

export function toMoney(value: unknown): number {
  return Number(value);
}

export function toEmployeeSummary(
  employee: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName'>,
): PayrollEmployeeSummary {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
  };
}

export function toPayrollResponse(
  record: PayrollWithEmployee,
  calculation: PayrollCalculation,
): PayrollResponse {
  return {
    id: record.id,
    employeeId: record.employeeId,
    employee: toEmployeeSummary(record.employee),
    payrollMonth: record.payrollMonth,
    payrollYear: record.payrollYear,
    basicSalary: toMoney(record.basicSalary),
    allowances: toMoney(record.allowances),
    overtimeAmount: toMoney(record.overtimeAmount),
    deductions: toMoney(record.deductions),
    unpaidLeaveDeduction: toMoney(record.unpaidLeaveDeduction),
    otherDeductions: toMoney(record.otherDeductions),
    unpaidLeaveDays: record.unpaidLeaveDays,
    workingDaysPerMonth: calculation.workingDaysPerMonth,
    dailyRate: calculation.dailyRate,
    grossSalary: toMoney(record.grossSalary),
    netSalary: toMoney(record.netSalary),
    paymentStatus: record.paymentStatus,
    paymentDate: record.paymentDate ? toDateOnly(record.paymentDate) : null,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
