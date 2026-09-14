import { Controller, Get, Header, Query } from '@nestjs/common';
import { QueryAttendanceReportDto } from '../reports/dto/query-attendance-report.dto';
import { QueryDocumentReportDto } from '../reports/dto/query-document-report.dto';
import { QueryEmployeeReportDto } from '../reports/dto/query-employee-report.dto';
import { QueryInvoiceReportDto } from '../reports/dto/query-invoice-report.dto';
import { QueryLeaveReportDto } from '../reports/dto/query-leave-report.dto';
import { QueryPayrollReportDto } from '../reports/dto/query-payroll-report.dto';
import { ExportService } from './export.service';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exportService: ExportService) {}

  @Get('employees/pdf')
  @Header('Cache-Control', 'private, no-store')
  employeesPdf(@Query() query: QueryEmployeeReportDto) {
    return this.exportService.employees(query, 'pdf');
  }

  @Get('employees/csv')
  @Header('Cache-Control', 'private, no-store')
  employeesCsv(@Query() query: QueryEmployeeReportDto) {
    return this.exportService.employees(query, 'csv');
  }

  @Get('employees/xlsx')
  @Header('Cache-Control', 'private, no-store')
  employeesXlsx(@Query() query: QueryEmployeeReportDto) {
    return this.exportService.employees(query, 'xlsx');
  }

  @Get('attendance/pdf')
  @Header('Cache-Control', 'private, no-store')
  attendancePdf(@Query() query: QueryAttendanceReportDto) {
    return this.exportService.attendance(query, 'pdf');
  }

  @Get('attendance/csv')
  @Header('Cache-Control', 'private, no-store')
  attendanceCsv(@Query() query: QueryAttendanceReportDto) {
    return this.exportService.attendance(query, 'csv');
  }

  @Get('attendance/xlsx')
  @Header('Cache-Control', 'private, no-store')
  attendanceXlsx(@Query() query: QueryAttendanceReportDto) {
    return this.exportService.attendance(query, 'xlsx');
  }

  @Get('leave/pdf')
  @Header('Cache-Control', 'private, no-store')
  leavePdf(@Query() query: QueryLeaveReportDto) {
    return this.exportService.leave(query, 'pdf');
  }

  @Get('leave/csv')
  @Header('Cache-Control', 'private, no-store')
  leaveCsv(@Query() query: QueryLeaveReportDto) {
    return this.exportService.leave(query, 'csv');
  }

  @Get('leave/xlsx')
  @Header('Cache-Control', 'private, no-store')
  leaveXlsx(@Query() query: QueryLeaveReportDto) {
    return this.exportService.leave(query, 'xlsx');
  }

  @Get('payroll/pdf')
  @Header('Cache-Control', 'private, no-store')
  payrollPdf(@Query() query: QueryPayrollReportDto) {
    return this.exportService.payroll(query, 'pdf');
  }

  @Get('payroll/csv')
  @Header('Cache-Control', 'private, no-store')
  payrollCsv(@Query() query: QueryPayrollReportDto) {
    return this.exportService.payroll(query, 'csv');
  }

  @Get('payroll/xlsx')
  @Header('Cache-Control', 'private, no-store')
  payrollXlsx(@Query() query: QueryPayrollReportDto) {
    return this.exportService.payroll(query, 'xlsx');
  }

  @Get('invoices/pdf')
  @Header('Cache-Control', 'private, no-store')
  invoicesPdf(@Query() query: QueryInvoiceReportDto) {
    return this.exportService.invoices(query, 'pdf');
  }

  @Get('invoices/csv')
  @Header('Cache-Control', 'private, no-store')
  invoicesCsv(@Query() query: QueryInvoiceReportDto) {
    return this.exportService.invoices(query, 'csv');
  }

  @Get('invoices/xlsx')
  @Header('Cache-Control', 'private, no-store')
  invoicesXlsx(@Query() query: QueryInvoiceReportDto) {
    return this.exportService.invoices(query, 'xlsx');
  }

  @Get('documents/pdf')
  @Header('Cache-Control', 'private, no-store')
  documentsPdf(@Query() query: QueryDocumentReportDto) {
    return this.exportService.documents(query, 'pdf');
  }

  @Get('documents/csv')
  @Header('Cache-Control', 'private, no-store')
  documentsCsv(@Query() query: QueryDocumentReportDto) {
    return this.exportService.documents(query, 'csv');
  }

  @Get('documents/xlsx')
  @Header('Cache-Control', 'private, no-store')
  documentsXlsx(@Query() query: QueryDocumentReportDto) {
    return this.exportService.documents(query, 'xlsx');
  }
}
