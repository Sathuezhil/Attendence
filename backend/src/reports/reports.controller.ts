import { Controller, Get, Query } from '@nestjs/common';
import { QueryAttendanceReportDto } from './dto/query-attendance-report.dto';
import { QueryDocumentReportDto } from './dto/query-document-report.dto';
import { QueryEmployeeReportDto } from './dto/query-employee-report.dto';
import { QueryInvoiceReportDto } from './dto/query-invoice-report.dto';
import { QueryLeaveReportDto } from './dto/query-leave-report.dto';
import { QueryPayrollReportDto } from './dto/query-payroll-report.dto';
import { ReportsService } from './reports.service';
import type {
  AttendanceReportResponse,
  DocumentReportResponse,
  EmployeeReportResponse,
  InvoiceReportResponse,
  LeaveReportResponse,
  PayrollReportResponse,
} from './reports.types';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('employees')
  employees(
    @Query() query: QueryEmployeeReportDto,
  ): Promise<EmployeeReportResponse> {
    return this.reportsService.getEmployeeReport(query);
  }

  @Get('attendance')
  attendance(
    @Query() query: QueryAttendanceReportDto,
  ): Promise<AttendanceReportResponse> {
    return this.reportsService.getAttendanceReport(query);
  }

  @Get('leave')
  leave(@Query() query: QueryLeaveReportDto): Promise<LeaveReportResponse> {
    return this.reportsService.getLeaveReport(query);
  }

  @Get('payroll')
  payroll(
    @Query() query: QueryPayrollReportDto,
  ): Promise<PayrollReportResponse> {
    return this.reportsService.getPayrollReport(query);
  }

  @Get('invoices')
  invoices(
    @Query() query: QueryInvoiceReportDto,
  ): Promise<InvoiceReportResponse> {
    return this.reportsService.getInvoiceReport(query);
  }

  @Get('documents')
  documents(
    @Query() query: QueryDocumentReportDto,
  ): Promise<DocumentReportResponse> {
    return this.reportsService.getDocumentReport(query);
  }
}
