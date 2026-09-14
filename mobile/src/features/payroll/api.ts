import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ApiError } from '@/lib/api';
import {
  asDateOnly,
  asIso,
  asNumber,
  asString,
  asStringOrNull,
  createRecord,
  getById,
  includesInsensitive,
  listCollection,
  paginate,
  updateRecord,
  writeAudit,
} from '@/lib/data';
import {
  calculatePayroll,
  loadSettings,
  monthDateRange,
  overlappingDays,
} from '@/lib/domain';
import { getDb } from '@/lib/firebase';
import { fetchEmployee, loadEmployeeMap } from '@/features/employees/api';
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
  search?: string;
}

async function unpaidLeaveDays(employeeId: string, year: number, month: number): Promise<number> {
  const range = monthDateRange(year, month);
  const leaves = await listCollection('leaves');
  return leaves
    .filter(
      (row) =>
        asString(row.employeeId) === employeeId &&
        asString(row.leaveType) === 'UNPAID' &&
        asString(row.status) === 'APPROVED',
    )
    .reduce((total, row) => {
      const start = asDateOnly(row.startDate);
      const end = asDateOnly(row.endDate);
      if (!start || !end) {
        return total;
      }
      return total + overlappingDays(start, end, range.start, range.end);
    }, 0);
}

async function previewFrom(payload: PayrollWritePayload): Promise<PayrollPreview> {
  const employee = await fetchEmployee(payload.employeeId);
  const settings = await loadSettings();
  const basicSalary = payload.basicSalary ?? employee.basicSalary;
  if (basicSalary == null) {
    throw new ApiError('basicSalary is required', 400);
  }
  const overtimeAmount = settings.payroll.overtimeEnabled ? (payload.overtimeAmount ?? 0) : 0;
  const unpaid = await unpaidLeaveDays(payload.employeeId, payload.payrollYear, payload.payrollMonth);
  const totals = calculatePayroll({
    basicSalary,
    allowances: payload.allowances ?? 0,
    overtimeAmount,
    deductions: payload.deductions ?? 0,
    otherDeductions: payload.otherDeductions ?? 0,
    unpaidLeaveDays: unpaid,
    workingDaysPerMonth: settings.payroll.workingDaysPerMonth,
  });
  return {
    employeeId: payload.employeeId,
    payrollMonth: payload.payrollMonth,
    payrollYear: payload.payrollYear,
    ...totals,
  };
}

function mapPayroll(
  row: Record<string, unknown> & { id: string },
  employee: PayrollRecord['employee'],
  workingDaysPerMonth: number,
): PayrollRecord {
  const basicSalary = asNumber(row.basicSalary);
  const dailyRate =
    workingDaysPerMonth > 0 ? Math.round((basicSalary / workingDaysPerMonth) * 100) / 100 : 0;
  return {
    id: row.id,
    employeeId: asString(row.employeeId),
    employee,
    payrollMonth: asNumber(row.payrollMonth),
    payrollYear: asNumber(row.payrollYear),
    basicSalary,
    allowances: asNumber(row.allowances),
    overtimeAmount: asNumber(row.overtimeAmount),
    deductions: asNumber(row.deductions),
    unpaidLeaveDeduction: asNumber(row.unpaidLeaveDeduction),
    otherDeductions: asNumber(row.otherDeductions),
    unpaidLeaveDays: asNumber(row.unpaidLeaveDays),
    workingDaysPerMonth,
    dailyRate,
    grossSalary: asNumber(row.grossSalary),
    netSalary: asNumber(row.netSalary),
    paymentStatus: asString(row.paymentStatus, 'PENDING') as PaymentStatus,
    paymentDate: asDateOnly(row.paymentDate),
    notes: asStringOrNull(row.notes),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

export async function fetchPayroll(params: PayrollListParams = {}): Promise<PaginatedPayroll> {
  const employees = await loadEmployeeMap();
  const settings = await loadSettings();
  const search = params.search?.trim() ?? '';
  let rows = (await listCollection('payroll_records'))
    .map((row) => {
      const employee = employees.get(asString(row.employeeId));
      if (!employee) {
        return null;
      }
      return mapPayroll(
        row,
        {
          id: employee.id,
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
          fullName: employee.fullName,
        },
        settings.payroll.workingDaysPerMonth,
      );
    })
    .filter((row): row is PayrollRecord => row !== null);

  if (params.employeeId) rows = rows.filter((row) => row.employeeId === params.employeeId);
  if (params.month) rows = rows.filter((row) => row.payrollMonth === params.month);
  if (params.year) rows = rows.filter((row) => row.payrollYear === params.year);
  if (params.paymentStatus) rows = rows.filter((row) => row.paymentStatus === params.paymentStatus);
  if (search) {
    rows = rows.filter(
      (row) =>
        includesInsensitive(row.employee.fullName, search) ||
        includesInsensitive(row.employee.employeeCode, search),
    );
  }
  rows.sort((a, b) => b.payrollYear - a.payrollYear || b.payrollMonth - a.payrollMonth);
  return paginate(rows, params.page, params.limit);
}

export async function fetchEmployeePayroll(employeeId: string): Promise<PayrollRecord[]> {
  const result = await fetchPayroll({ employeeId, limit: 500 });
  return result.data;
}

export async function fetchPayrollRecord(id: string): Promise<PayrollRecord> {
  const row = await getById('payroll_records', id);
  const employee = await fetchEmployee(asString(row.employeeId));
  const settings = await loadSettings();
  return mapPayroll(
    row,
    {
      id: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: employee.fullName,
    },
    settings.payroll.workingDaysPerMonth,
  );
}

export function previewPayroll(payload: PayrollWritePayload): Promise<PayrollPreview> {
  return previewFrom(payload);
}

export async function createPayroll(payload: PayrollWritePayload): Promise<PayrollRecord> {
  const existing = await listCollection('payroll_records');
  if (
    existing.some(
      (row) =>
        asString(row.employeeId) === payload.employeeId &&
        asNumber(row.payrollMonth) === payload.payrollMonth &&
        asNumber(row.payrollYear) === payload.payrollYear,
    )
  ) {
    throw new ApiError('Payroll for this month already exists', 409);
  }
  const preview = await previewFrom(payload);
  const created = await createRecord('payroll_records', {
    employeeId: payload.employeeId,
    payrollMonth: payload.payrollMonth,
    payrollYear: payload.payrollYear,
    basicSalary: preview.basicSalary,
    allowances: preview.allowances,
    overtimeAmount: preview.overtimeAmount,
    deductions: preview.deductions,
    unpaidLeaveDeduction: preview.unpaidLeaveDeduction,
    otherDeductions: preview.otherDeductions,
    unpaidLeaveDays: preview.unpaidLeaveDays,
    grossSalary: preview.grossSalary,
    netSalary: preview.netSalary,
    paymentStatus: 'PENDING',
    paymentDate: null,
    notes: payload.notes ?? null,
  });
  const employee = await fetchEmployee(payload.employeeId);
  await addDoc(collection(getDb(), 'notifications'), {
    type: 'PAYROLL_CREATED',
    title: 'Payroll created',
    message: `Payroll for ${employee.fullName} is ready.`,
    employeeId: payload.employeeId,
    documentId: null,
    isRead: false,
    readAt: null,
    eventKey: `payroll-created:${created.id}`,
    createdAt: serverTimestamp(),
  });
  await writeAudit('create', 'payroll', created.id);
  return fetchPayrollRecord(created.id);
}

export async function markPayrollPaid(id: string): Promise<PayrollRecord> {
  await updateRecord('payroll_records', id, {
    paymentStatus: 'PAID',
    paymentDate: new Date().toISOString().slice(0, 10),
  });
  await writeAudit('mark-paid', 'payroll', id);
  return fetchPayrollRecord(id);
}

export async function cancelPayroll(id: string): Promise<PayrollRecord> {
  await updateRecord('payroll_records', id, { paymentStatus: 'CANCELLED' });
  await writeAudit('cancel', 'payroll', id);
  return fetchPayrollRecord(id);
}
