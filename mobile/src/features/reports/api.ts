import { asDateOnly, asNumber, asString, listCollection } from '@/lib/data';
import {
  calculateExpiryStatus,
  loadSettings,
  roundMoney,
  toPublicDocumentType,
} from '@/lib/domain';
import { loadEmployeeMap, loadEmployeeRows, mapEmployee } from '@/features/employees/api';
import {
  AttendanceReport,
  DocumentReport,
  EmployeeReport,
  InvoiceReport,
  LeaveReport,
  PayrollReport,
} from './types';

function period(params: Record<string, string | number | undefined>) {
  return {
    startDate: String(params.startDate ?? params.fromDate ?? ''),
    endDate: String(params.endDate ?? params.toDate ?? ''),
  };
}

function inPeriod(date: string | null, start: string, end: string): boolean {
  if (!date) return !start && !end;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export async function fetchEmployeeReport(
  params: Record<string, string | undefined> = {},
): Promise<EmployeeReport> {
  let rows = (await loadEmployeeRows()).map(mapEmployee);
  if (params.employmentStatus) {
    rows = rows.filter((row) => row.employmentStatus === params.employmentStatus);
  }
  return {
    total: rows.length,
    active: rows.filter((row) => row.employmentStatus === 'ACTIVE').length,
    inactive: rows.filter((row) => row.employmentStatus === 'INACTIVE').length,
    onLeave: rows.filter((row) => row.employmentStatus === 'ON_LEAVE').length,
    terminated: rows.filter((row) => row.employmentStatus === 'TERMINATED').length,
  };
}

export async function fetchAttendanceReport(
  params: Record<string, string | undefined> = {},
): Promise<AttendanceReport> {
  const range = period(params);
  const rows = (await listCollection('attendances')).filter((row) =>
    inPeriod(asDateOnly(row.date), range.startDate, range.endDate),
  );
  let present = 0;
  let late = 0;
  let halfDay = 0;
  let onLeave = 0;
  let workingMinutes = 0;
  let lateMinutes = 0;
  for (const row of rows) {
    const status = asString(row.status);
    if (status === 'HALF_DAY') halfDay += 1;
    else if (status === 'ON_LEAVE' || status === 'LEAVE' || status === 'ABSENT') onLeave += 1;
    else if (status !== 'HOLIDAY') present += 1;
    if (asNumber(row.lateMinutes) > 0) late += 1;
    workingMinutes += asNumber(row.workingMinutes);
    lateMinutes += asNumber(row.lateMinutes);
  }
  const recordedDays = rows.length;
  return {
    period: range,
    present,
    absent: 0,
    late,
    halfDay,
    onLeave,
    attendancePercentage: recordedDays ? roundMoney((present / recordedDays) * 100) : 0,
    totalWorkingHours: roundMoney(workingMinutes / 60),
    lateMinutes,
    recordedDays,
  };
}

export async function fetchLeaveReport(
  params: Record<string, string | number | undefined> = {},
): Promise<LeaveReport> {
  const range = period(params);
  const employees = await loadEmployeeMap();
  const page = Number(params.page ?? 1) || 1;
  const limit = Number(params.limit ?? 20) || 20;
  const rows = (await listCollection('leaves')).filter((row) => {
    const start = asDateOnly(row.startDate) ?? '';
    const end = asDateOnly(row.endDate) ?? '';
    if (range.startDate && end < range.startDate) return false;
    if (range.endDate && start > range.endDate) return false;
    if (params.status && asString(row.status) !== params.status) return false;
    if (params.leaveType && asString(row.leaveType) !== params.leaveType) return false;
    return true;
  });
  const daysByLeaveType = new Map<string, { requests: number; days: number }>();
  const byEmployee = new Map<string, { requests: number; days: number }>();
  for (const row of rows) {
    const type = asString(row.leaveType, 'OTHER');
    const days = asNumber(row.totalDays);
    const typeEntry = daysByLeaveType.get(type) ?? { requests: 0, days: 0 };
    typeEntry.requests += 1;
    typeEntry.days += days;
    daysByLeaveType.set(type, typeEntry);
    const employeeEntry = byEmployee.get(asString(row.employeeId)) ?? { requests: 0, days: 0 };
    employeeEntry.requests += 1;
    employeeEntry.days += days;
    byEmployee.set(asString(row.employeeId), employeeEntry);
  }
  const summaries = [...byEmployee.entries()].map(([employeeId, stats]) => {
    const employee = employees.get(employeeId);
    return {
      employeeId,
      employeeCode: employee?.employeeCode ?? '',
      fullName: employee?.fullName ?? 'Unknown',
      requests: stats.requests,
      days: stats.days,
    };
  });
  const start = (page - 1) * limit;
  return {
    period: range,
    total: rows.length,
    approved: rows.filter((row) => asString(row.status) === 'APPROVED').length,
    rejected: rows.filter((row) => asString(row.status) === 'REJECTED').length,
    pending: rows.filter((row) => asString(row.status) === 'PENDING').length,
    cancelled: rows.filter((row) => asString(row.status) === 'CANCELLED').length,
    daysByLeaveType: [...daysByLeaveType.entries()].map(([leaveType, stats]) => ({
      leaveType,
      ...stats,
    })),
    employeeSummaries: summaries.slice(start, start + limit),
    page,
    limit,
    totalEmployees: summaries.length,
    totalPages: Math.ceil(summaries.length / limit) || 0,
  };
}

export async function fetchPayrollReport(
  params: Record<string, string | number | undefined> = {},
): Promise<PayrollReport> {
  let rows = await listCollection('payroll_records');
  if (params.year) rows = rows.filter((row) => asNumber(row.payrollYear) === Number(params.year));
  if (params.month) rows = rows.filter((row) => asNumber(row.payrollMonth) === Number(params.month));
  const monthly = new Map<string, { year: number; month: number; grossSalary: number; netSalary: number }>();
  let grossSalary = 0;
  let netSalary = 0;
  let deductions = 0;
  let paidAmount = 0;
  let pendingAmount = 0;
  for (const row of rows) {
    const gross = asNumber(row.grossSalary);
    const net = asNumber(row.netSalary);
    const deducted =
      asNumber(row.deductions) + asNumber(row.unpaidLeaveDeduction) + asNumber(row.otherDeductions);
    grossSalary += gross;
    netSalary += net;
    deductions += deducted;
    if (asString(row.paymentStatus) === 'PAID') paidAmount += net;
    if (asString(row.paymentStatus) === 'PENDING') pendingAmount += net;
    const key = `${asNumber(row.payrollYear)}-${asNumber(row.payrollMonth)}`;
    const point = monthly.get(key) ?? {
      year: asNumber(row.payrollYear),
      month: asNumber(row.payrollMonth),
      grossSalary: 0,
      netSalary: 0,
    };
    point.grossSalary += gross;
    point.netSalary += net;
    monthly.set(key, point);
  }
  return {
    totalPayroll: rows.length,
    grossSalary: roundMoney(grossSalary),
    totalDeductions: roundMoney(deductions),
    netSalary: roundMoney(netSalary),
    paidAmount: roundMoney(paidAmount),
    pendingAmount: roundMoney(pendingAmount),
    monthlyTrend: [...monthly.values()].sort((a, b) => a.year - b.year || a.month - b.month),
  };
}

export async function fetchInvoiceReport(
  params: Record<string, string | undefined> = {},
): Promise<InvoiceReport> {
  const range = period(params);
  const rows = (await listCollection('invoices')).filter((row) =>
    inPeriod(asDateOnly(row.invoiceDate), range.startDate, range.endDate),
  );
  const open = new Set(['SENT', 'PARTIALLY_PAID', 'OVERDUE']);
  return {
    period: range,
    total: rows.length,
    paid: rows.filter((row) => asString(row.status) === 'PAID').length,
    pending: rows.filter((row) => open.has(asString(row.status))).length,
    overdue: rows.filter((row) => asString(row.status) === 'OVERDUE').length,
    cancelled: rows.filter((row) => asString(row.status) === 'CANCELLED').length,
    totalInvoicedAmount: roundMoney(rows.reduce((sum, row) => sum + asNumber(row.totalAmount), 0)),
    totalPaidAmount: roundMoney(
      rows
        .filter((row) => asString(row.status) === 'PAID')
        .reduce((sum, row) => sum + asNumber(row.totalAmount), 0),
    ),
    outstandingAmount: roundMoney(
      rows
        .filter((row) => open.has(asString(row.status)))
        .reduce((sum, row) => sum + asNumber(row.totalAmount), 0),
    ),
  };
}

export async function fetchDocumentReport(
  params: Record<string, string | undefined> = {},
): Promise<DocumentReport> {
  const settings = await loadSettings();
  const rows = await listCollection('documents');
  const byType = new Map<
    string,
    { total: number; valid: number; expiringSoon: number; expired: number }
  >();
  let valid = 0;
  let expiringSoon = 0;
  let expired = 0;
  for (const row of rows) {
    if (params.documentType && asString(row.documentType) !== params.documentType) {
      continue;
    }
    const type = toPublicDocumentType(asString(row.documentType, 'OTHER'));
    const status = calculateExpiryStatus(
      asDateOnly(row.expiryDate),
      settings.documents.expiryWarningDays,
    );
    const entry = byType.get(type) ?? { total: 0, valid: 0, expiringSoon: 0, expired: 0 };
    entry.total += 1;
    if (status === 'VALID' || status === 'NO_EXPIRY') {
      valid += 1;
      entry.valid += 1;
    } else if (status === 'EXPIRING_SOON') {
      expiringSoon += 1;
      entry.expiringSoon += 1;
    } else {
      expired += 1;
      entry.expired += 1;
    }
    byType.set(type, entry);
  }
  return {
    total: valid + expiringSoon + expired,
    valid,
    expiringSoon,
    expired,
    warningDays: settings.documents.expiryWarningDays,
    byDocumentType: [...byType.entries()].map(([documentType, stats]) => ({
      documentType,
      ...stats,
    })),
  };
}
