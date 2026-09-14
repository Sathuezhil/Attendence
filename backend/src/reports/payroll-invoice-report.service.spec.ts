import { InvoiceStatus, PayrollPaymentStatus } from '@prisma/client';
import { InvoiceReportService } from './invoice-report.service';
import { PayrollReportService } from './payroll-report.service';

describe('PayrollReportService', () => {
  const prisma = {
    payrollRecord: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
  };
  const service = new PayrollReportService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payrollRecord.aggregate.mockResolvedValue({
      _count: { _all: 2 },
      _sum: {
        grossSalary: 5000,
        netSalary: 4300,
        deductions: 200,
        unpaidLeaveDeduction: 400,
        otherDeductions: 100,
      },
    });
    prisma.payrollRecord.groupBy
      .mockResolvedValueOnce([
        {
          paymentStatus: PayrollPaymentStatus.PAID,
          _count: { _all: 1 },
          _sum: { netSalary: 2500 },
        },
        {
          paymentStatus: PayrollPaymentStatus.PENDING,
          _count: { _all: 1 },
          _sum: { netSalary: 1800 },
        },
      ])
      .mockResolvedValueOnce([
        {
          payrollYear: 2026,
          payrollMonth: 8,
          _sum: { grossSalary: 2400, netSalary: 2100 },
        },
        {
          payrollYear: 2026,
          payrollMonth: 9,
          _sum: { grossSalary: 2600, netSalary: 2200 },
        },
      ]);
  });

  it('sums payroll amounts from stored records', async () => {
    const result = await service.getReport({ year: 2026 });

    expect(result.totalPayroll).toBe(2);
    expect(result.grossSalary).toBe(5000);
    expect(result.totalDeductions).toBe(700);
    expect(result.netSalary).toBe(4300);
    expect(result.paidAmount).toBe(2500);
    expect(result.pendingAmount).toBe(1800);
    expect(result.monthlyTrend).toHaveLength(2);
  });
});

describe('InvoiceReportService', () => {
  const prisma = {
    invoice: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };
  const invoicesService = {
    markOverdueInvoices: jest.fn(),
  };
  const service = new InvoiceReportService(
    prisma as never,
    invoicesService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    invoicesService.markOverdueInvoices.mockResolvedValue(1);
    prisma.invoice.groupBy.mockResolvedValue([
      { status: InvoiceStatus.PAID, _count: { _all: 2 } },
      { status: InvoiceStatus.SENT, _count: { _all: 1 } },
      { status: InvoiceStatus.OVERDUE, _count: { _all: 1 } },
      { status: InvoiceStatus.CANCELLED, _count: { _all: 1 } },
    ]);
    prisma.invoice.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 900 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 500 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 400 } });
  });

  it('marks overdue invoices then aggregates amounts', async () => {
    const result = await service.getReport({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    expect(invoicesService.markOverdueInvoices).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(5);
    expect(result.paid).toBe(2);
    expect(result.pending).toBe(1);
    expect(result.overdue).toBe(1);
    expect(result.cancelled).toBe(1);
    expect(result.totalInvoicedAmount).toBe(900);
    expect(result.totalPaidAmount).toBe(500);
    expect(result.outstandingAmount).toBe(400);
  });
});
