import { Injectable } from '@nestjs/common';
import { AttendanceReportService } from './attendance-report.service';
import { DocumentReportService } from './document-report.service';
import { EmployeeReportService } from './employee-report.service';
import { InvoiceReportService } from './invoice-report.service';
import { LeaveReportService } from './leave-report.service';
import { PayrollReportService } from './payroll-report.service';
import { QueryAttendanceReportDto } from './dto/query-attendance-report.dto';
import { QueryDocumentReportDto } from './dto/query-document-report.dto';
import { QueryEmployeeReportDto } from './dto/query-employee-report.dto';
import { QueryInvoiceReportDto } from './dto/query-invoice-report.dto';
import { QueryLeaveReportDto } from './dto/query-leave-report.dto';
import { QueryPayrollReportDto } from './dto/query-payroll-report.dto';
import {
  AttendanceReportResponse,
  DocumentReportResponse,
  EmployeeReportResponse,
  InvoiceReportResponse,
  LeaveReportResponse,
  PayrollReportResponse,
} from './reports.types';

@Injectable()
export class ReportsService {
  constructor(
    private readonly employees: EmployeeReportService,
    private readonly attendance: AttendanceReportService,
    private readonly leave: LeaveReportService,
    private readonly payroll: PayrollReportService,
    private readonly invoices: InvoiceReportService,
    private readonly documents: DocumentReportService,
  ) {}

  getEmployeeReport(
    query: QueryEmployeeReportDto,
  ): Promise<EmployeeReportResponse> {
    return this.employees.getReport(query);
  }

  getAttendanceReport(
    query: QueryAttendanceReportDto,
  ): Promise<AttendanceReportResponse> {
    return this.attendance.getReport(query);
  }

  getLeaveReport(query: QueryLeaveReportDto): Promise<LeaveReportResponse> {
    return this.leave.getReport(query);
  }

  getPayrollReport(
    query: QueryPayrollReportDto,
  ): Promise<PayrollReportResponse> {
    return this.payroll.getReport(query);
  }

  getInvoiceReport(
    query: QueryInvoiceReportDto,
  ): Promise<InvoiceReportResponse> {
    return this.invoices.getReport(query);
  }

  getDocumentReport(
    query: QueryDocumentReportDto,
  ): Promise<DocumentReportResponse> {
    return this.documents.getReport(query);
  }
}
