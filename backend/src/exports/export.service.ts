import {
  Injectable,
  InternalServerErrorException,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { QueryAttendanceReportDto } from '../reports/dto/query-attendance-report.dto';
import { QueryDocumentReportDto } from '../reports/dto/query-document-report.dto';
import { QueryEmployeeReportDto } from '../reports/dto/query-employee-report.dto';
import { QueryInvoiceReportDto } from '../reports/dto/query-invoice-report.dto';
import { QueryLeaveReportDto } from '../reports/dto/query-leave-report.dto';
import { QueryPayrollReportDto } from '../reports/dto/query-payroll-report.dto';
import { ReportsService } from '../reports/reports.service';
import { CsvService } from './csv.service';
import {
  CSV_MIME,
  EXPORT_MAX_ROWS,
  PDF_MAX_ROWS,
  PDF_MIME,
  XLSX_MIME,
} from './export.constants';
import { toDownload } from './export-file';
import {
  fileStem,
  formatDateTime,
  formatMoney,
  listedFilters,
} from './export-format';
import { ExportDataService } from './export-data.service';
import { ExcelService } from './excel.service';
import { PdfService } from './pdf.service';
import { ReportExportDocument } from './export.types';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly reports: ReportsService,
    private readonly data: ExportDataService,
    private readonly csvService: CsvService,
    private readonly excelService: ExcelService,
    private readonly pdfService: PdfService,
  ) {}

  employees(query: QueryEmployeeReportDto, format: ExportFormat) {
    return this.build(async (maxRows) => {
      const report = await this.reports.getEmployeeReport(query);
      return this.document(
        'Employee Report',
        listedFilters([
          ['Status', query.status],
          ['Job title', query.jobTitle],
          ['Joining from', query.joiningFrom],
          ['Joining to', query.joiningTo],
        ]),
        [
          { label: 'Total employees', value: String(report.total) },
          { label: 'Active', value: String(report.active) },
          { label: 'Inactive', value: String(report.inactive) },
          { label: 'On leave', value: String(report.onLeave) },
          { label: 'Terminated', value: String(report.terminated) },
        ],
        await this.data.employeeRows(query, maxRows),
      );
    }, format);
  }

  attendance(query: QueryAttendanceReportDto, format: ExportFormat) {
    return this.build(async (maxRows) => {
      const report = await this.reports.getAttendanceReport(query);
      return this.document(
        'Attendance Report',
        listedFilters([
          ['Employee', query.employeeId],
          ['Start date', query.startDate ?? report.period.startDate],
          ['End date', query.endDate ?? report.period.endDate],
          ['Status', query.status],
        ]),
        [
          { label: 'Active', value: String(report.present + report.late) },
          { label: 'Leave', value: String(report.absent + report.onLeave) },
          { label: 'Half-day', value: String(report.halfDay) },
          { label: 'Attendance %', value: `${report.attendancePercentage}` },
          { label: 'Working hours', value: String(report.totalWorkingHours) },
          { label: 'Late minutes', value: String(report.lateMinutes) },
        ],
        await this.data.attendanceRows(query, maxRows),
      );
    }, format);
  }

  leave(query: QueryLeaveReportDto, format: ExportFormat) {
    return this.build(async (maxRows) => {
      const report = await this.reports.getLeaveReport({
        ...query,
        page: 1,
        limit: 100,
      });
      return this.document(
        'Leave Report',
        listedFilters([
          ['Employee', query.employeeId],
          ['Leave type', query.leaveType],
          ['Status', query.status],
          ['Start date', query.startDate ?? report.period.startDate],
          ['End date', query.endDate ?? report.period.endDate],
        ]),
        [
          { label: 'Total requests', value: String(report.total) },
          { label: 'Approved', value: String(report.approved) },
          { label: 'Rejected', value: String(report.rejected) },
          { label: 'Pending', value: String(report.pending) },
          ...report.daysByLeaveType.map((item) => ({
            label: `Days · ${item.leaveType.replaceAll('_', ' ')}`,
            value: String(item.days),
          })),
        ],
        await this.data.leaveRows(query, maxRows),
      );
    }, format);
  }

  payroll(query: QueryPayrollReportDto, format: ExportFormat) {
    return this.build(async (maxRows) => {
      const report = await this.reports.getPayrollReport(query);
      return this.document(
        'Payroll Report',
        listedFilters([
          ['Month', query.month],
          ['Year', query.year],
          ['Employee', query.employeeId],
          ['Payment status', query.paymentStatus],
        ]),
        [
          { label: 'Total payroll', value: String(report.totalPayroll) },
          { label: 'Gross salary', value: formatMoney(report.grossSalary) },
          {
            label: 'Total deductions',
            value: formatMoney(report.totalDeductions),
          },
          { label: 'Net salary', value: formatMoney(report.netSalary) },
          { label: 'Paid amount', value: formatMoney(report.paidAmount) },
          { label: 'Pending amount', value: formatMoney(report.pendingAmount) },
        ],
        await this.data.payrollRows(query, maxRows),
      );
    }, format);
  }

  invoices(query: QueryInvoiceReportDto, format: ExportFormat) {
    return this.build(async (maxRows) => {
      const report = await this.reports.getInvoiceReport(query);
      return this.document(
        'Invoice Report',
        listedFilters([
          ['Start date', query.startDate ?? report.period.startDate],
          ['End date', query.endDate ?? report.period.endDate],
          ['Status', query.status],
        ]),
        [
          { label: 'Total invoices', value: String(report.total) },
          { label: 'Paid', value: String(report.paid) },
          { label: 'Pending', value: String(report.pending) },
          { label: 'Overdue', value: String(report.overdue) },
          { label: 'Cancelled', value: String(report.cancelled) },
          {
            label: 'Invoiced amount',
            value: formatMoney(report.totalInvoicedAmount),
          },
          { label: 'Paid amount', value: formatMoney(report.totalPaidAmount) },
          {
            label: 'Outstanding amount',
            value: formatMoney(report.outstandingAmount),
          },
        ],
        await this.data.invoiceRows(query, maxRows),
      );
    }, format);
  }

  documents(query: QueryDocumentReportDto, format: ExportFormat) {
    return this.build(async (maxRows) => {
      const report = await this.reports.getDocumentReport(query);
      return this.document(
        'Document Expiry Report',
        listedFilters([
          ['Document type', query.documentType],
          ['Employee', query.employeeId],
          ['Expiry from', query.expiryFrom],
          ['Expiry to', query.expiryTo],
        ]),
        [
          { label: 'Total documents', value: String(report.total) },
          { label: 'Valid', value: String(report.valid) },
          { label: 'Expiring soon', value: String(report.expiringSoon) },
          { label: 'Expired', value: String(report.expired) },
          ...report.byDocumentType.map((item) => ({
            label: item.documentType.replaceAll('_', ' '),
            value: `${item.total} (${item.valid} valid, ${item.expiringSoon} soon, ${item.expired} expired)`,
          })),
        ],
        await this.data.documentRows(query, maxRows),
      );
    }, format);
  }

  private document(
    title: string,
    filters: ReportExportDocument['filters'],
    summary: ReportExportDocument['summary'],
    table: ReportExportDocument['table'],
  ): ReportExportDocument {
    return {
      title,
      fileStem: fileStem(title),
      generatedAt: formatDateTime(),
      filters,
      summary,
      table,
    };
  }

  private async build(
    factory: (maxRows: number) => Promise<ReportExportDocument>,
    format: ExportFormat,
  ): Promise<StreamableFile> {
    const maxRows = format === 'pdf' ? PDF_MAX_ROWS : EXPORT_MAX_ROWS;
    const document = await factory(maxRows);
    try {
      if (format === 'csv') {
        return toDownload(
          this.csvService.build(document),
          `${document.fileStem}.csv`,
          CSV_MIME,
        );
      }
      if (format === 'xlsx') {
        return toDownload(
          await this.excelService.build(document),
          `${document.fileStem}.xlsx`,
          XLSX_MIME,
        );
      }
      return toDownload(
        await this.pdfService.report(document),
        `${document.fileStem}.pdf`,
        PDF_MIME,
      );
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error('Export generation failed');
      throw new InternalServerErrorException('Unable to generate export');
    }
  }
}
