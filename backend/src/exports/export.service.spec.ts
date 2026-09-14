import { StreamableFile } from '@nestjs/common';
import { ExportService } from './export.service';
import { ReportExportDocument } from './export.types';

function emptyTable() {
  return {
    columns: [{ key: 'name', header: 'Name' }],
    rows: [],
    truncated: false,
    totalMatches: 0,
    includedRows: 0,
  };
}

describe('ExportService', () => {
  const reports = {
    getEmployeeReport: jest.fn(),
    getAttendanceReport: jest.fn(),
    getLeaveReport: jest.fn(),
    getPayrollReport: jest.fn(),
    getInvoiceReport: jest.fn(),
    getDocumentReport: jest.fn(),
  };
  const data = {
    employeeRows: jest.fn(),
    attendanceRows: jest.fn(),
    leaveRows: jest.fn(),
    payrollRows: jest.fn(),
    invoiceRows: jest.fn(),
    documentRows: jest.fn(),
  };
  let captured: ReportExportDocument | undefined;
  const csvService = {
    build: jest.fn((document: ReportExportDocument) => {
      captured = document;
      return Buffer.from('csv');
    }),
  };
  const excelService = { build: jest.fn() };
  const pdfService = { report: jest.fn() };
  const service = new ExportService(
    reports as never,
    data as never,
    csvService as never,
    excelService as never,
    pdfService as never,
  );

  beforeEach(() => {
    captured = undefined;
    reports.getEmployeeReport.mockReset();
    reports.getPayrollReport.mockReset();
    csvService.build.mockClear();
    excelService.build.mockReset();
    pdfService.report.mockReset();
    data.employeeRows.mockReset();
    data.payrollRows.mockReset();
    excelService.build.mockResolvedValue(Buffer.from('xlsx'));
    pdfService.report.mockResolvedValue(Buffer.from('%PDF'));
    data.employeeRows.mockResolvedValue(emptyTable());
    data.attendanceRows.mockResolvedValue(emptyTable());
    data.leaveRows.mockResolvedValue(emptyTable());
    data.payrollRows.mockResolvedValue(emptyTable());
    data.invoiceRows.mockResolvedValue(emptyTable());
    data.documentRows.mockResolvedValue(emptyTable());
  });

  it('builds an empty employee CSV instead of failing', async () => {
    reports.getEmployeeReport.mockResolvedValue({
      total: 0,
      active: 0,
      inactive: 0,
      onLeave: 0,
      terminated: 0,
    });

    const file = await service.employees({}, 'csv');
    expect(file).toBeInstanceOf(StreamableFile);
    expect(captured?.title).toBe('Employee Report');
    expect(captured?.summary).toEqual(
      expect.arrayContaining([{ label: 'Total employees', value: '0' }]),
    );
  });

  it('passes report filters through to payroll PDF generation', async () => {
    reports.getPayrollReport.mockResolvedValue({
      totalPayroll: 0,
      grossSalary: 0,
      totalDeductions: 0,
      netSalary: 0,
      paidAmount: 0,
      pendingAmount: 0,
      monthlyTrend: [],
    });

    await service.payroll(
      { year: 2026, month: 9, paymentStatus: 'PENDING' },
      'pdf',
    );
    expect(data.payrollRows).toHaveBeenCalledWith(
      { year: 2026, month: 9, paymentStatus: 'PENDING' },
      800,
    );
    expect(pdfService.report).toHaveBeenCalled();
  });
});
