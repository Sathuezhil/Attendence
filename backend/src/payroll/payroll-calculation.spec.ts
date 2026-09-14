import {
  calculatePayroll,
  DEFAULT_WORKING_DAYS_PER_MONTH,
  monthDateRange,
  overlappingDays,
  resolveWorkingDaysPerMonth,
} from './payroll-calculation';

describe('payroll calculation', () => {
  it('uses 26 working days by default', () => {
    expect(DEFAULT_WORKING_DAYS_PER_MONTH).toBe(26);
    expect(resolveWorkingDaysPerMonth(undefined, 26)).toBe(26);
    expect(resolveWorkingDaysPerMonth({ days: 22 }, 26)).toBe(22);
  });

  it('adds allowances and overtime to gross salary', () => {
    const result = calculatePayroll({
      basicSalary: 2600,
      allowances: 200,
      overtimeAmount: 100,
      deductions: 0,
      otherDeductions: 0,
      unpaidLeaveDays: 0,
      workingDaysPerMonth: 26,
    });

    expect(result.grossSalary).toBe(2900);
    expect(result.netSalary).toBe(2900);
    expect(result.dailyRate).toBe(100);
  });

  it('subtracts deductions and unpaid leave from net salary', () => {
    const result = calculatePayroll({
      basicSalary: 2600,
      allowances: 0,
      overtimeAmount: 0,
      deductions: 50,
      otherDeductions: 25,
      unpaidLeaveDays: 2,
      workingDaysPerMonth: 26,
    });

    expect(result.unpaidLeaveDeduction).toBe(200);
    expect(result.netSalary).toBe(2325);
  });

  it('does not allow net salary to go below zero', () => {
    const result = calculatePayroll({
      basicSalary: 100,
      allowances: 0,
      overtimeAmount: 0,
      deductions: 80,
      otherDeductions: 40,
      unpaidLeaveDays: 0,
      workingDaysPerMonth: 26,
    });

    expect(result.netSalary).toBe(0);
  });

  it('counts unpaid leave days that overlap the payroll month', () => {
    const month = monthDateRange(2026, 9);
    expect(
      overlappingDays(
        new Date('2026-08-30T00:00:00.000Z'),
        new Date('2026-09-02T00:00:00.000Z'),
        month.start,
        month.end,
      ),
    ).toBe(2);
  });
});
