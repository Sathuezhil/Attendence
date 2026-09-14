export const DEFAULT_WORKING_DAYS_PER_MONTH = 26;

export interface PayrollInputs {
  basicSalary: number;
  allowances: number;
  overtimeAmount: number;
  deductions: number;
  otherDeductions: number;
  unpaidLeaveDays: number;
  workingDaysPerMonth: number;
}

export interface PayrollCalculation {
  basicSalary: number;
  allowances: number;
  overtimeAmount: number;
  deductions: number;
  otherDeductions: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  workingDaysPerMonth: number;
  dailyRate: number;
  grossSalary: number;
  netSalary: number;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function resolveWorkingDaysPerMonth(
  value: unknown,
  fallback: number,
): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }

  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { days?: unknown }).days === 'number'
  ) {
    return Math.max(1, Math.floor((value as { days: number }).days));
  }

  return Math.max(1, Math.floor(fallback) || DEFAULT_WORKING_DAYS_PER_MONTH);
}

export function monthDateRange(
  year: number,
  month: number,
): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

export function overlappingDays(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): number {
  const start = Math.max(
    Date.UTC(
      startA.getUTCFullYear(),
      startA.getUTCMonth(),
      startA.getUTCDate(),
    ),
    Date.UTC(
      startB.getUTCFullYear(),
      startB.getUTCMonth(),
      startB.getUTCDate(),
    ),
  );
  const end = Math.min(
    Date.UTC(endA.getUTCFullYear(), endA.getUTCMonth(), endA.getUTCDate()),
    Date.UTC(endB.getUTCFullYear(), endB.getUTCMonth(), endB.getUTCDate()),
  );

  if (end < start) {
    return 0;
  }

  return Math.round((end - start) / 86_400_000) + 1;
}

export function calculatePayroll(input: PayrollInputs): PayrollCalculation {
  const basicSalary = roundMoney(input.basicSalary);
  const allowances = roundMoney(input.allowances);
  const overtimeAmount = roundMoney(input.overtimeAmount);
  const deductions = roundMoney(input.deductions);
  const otherDeductions = roundMoney(input.otherDeductions);
  const unpaidLeaveDays = Math.max(0, Math.floor(input.unpaidLeaveDays));
  const workingDaysPerMonth = Math.max(
    1,
    Math.floor(input.workingDaysPerMonth),
  );
  const dailyRate = roundMoney(basicSalary / workingDaysPerMonth);
  const unpaidLeaveDeduction = roundMoney(dailyRate * unpaidLeaveDays);
  const grossSalary = roundMoney(basicSalary + allowances + overtimeAmount);
  const netSalary = roundMoney(
    Math.max(
      0,
      grossSalary - deductions - unpaidLeaveDeduction - otherDeductions,
    ),
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
