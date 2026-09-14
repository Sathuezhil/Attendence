import { Injectable } from '@nestjs/common';
import { calendarDate } from '../attendance/working-hours';
import { toPublicStatus } from '../attendance/attendance.mapper';
import { calculateExpiryStatus } from '../documents/document-expiry';
import { toPublicDocumentType } from '../documents/documents.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAttendanceReportDto } from '../reports/dto/query-attendance-report.dto';
import { QueryDocumentReportDto } from '../reports/dto/query-document-report.dto';
import { QueryEmployeeReportDto } from '../reports/dto/query-employee-report.dto';
import { QueryInvoiceReportDto } from '../reports/dto/query-invoice-report.dto';
import { QueryLeaveReportDto } from '../reports/dto/query-leave-report.dto';
import { QueryPayrollReportDto } from '../reports/dto/query-payroll-report.dto';
import { AttendanceReportService } from '../reports/attendance-report.service';
import { DocumentReportService } from '../reports/document-report.service';
import { EmployeeReportService } from '../reports/employee-report.service';
import { InvoiceReportService } from '../reports/invoice-report.service';
import { LeaveReportService } from '../reports/leave-report.service';
import { PayrollReportService } from '../reports/payroll-report.service';
import { minutesToHours, roundMoney } from '../reports/report-math';
import { resolveReportPeriod } from '../reports/report-period';
import { EXPORT_BATCH_SIZE } from './export.constants';
import {
  formatDate,
  formatMoney,
  formatTime,
  fullName,
  periodLabel,
  present,
} from './export-format';
import { ExportColumn, ExportTable } from './export.types';

@Injectable()
export class ExportDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employees: EmployeeReportService,
    private readonly attendance: AttendanceReportService,
    private readonly leave: LeaveReportService,
    private readonly payroll: PayrollReportService,
    private readonly invoices: InvoiceReportService,
    private readonly documents: DocumentReportService,
  ) {}

  async employeeRows(
    query: QueryEmployeeReportDto,
    maxRows: number,
  ): Promise<ExportTable> {
    const where = this.employees.where(query);
    const collected = await this.collect(
      () => this.prisma.employee.count({ where }),
      (skip, take) =>
        this.prisma.employee.findMany({
          where,
          skip,
          take,
          orderBy: [
            { lastName: 'asc' },
            { firstName: 'asc' },
            { employeeCode: 'asc' },
          ],
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            status: true,
            joiningDate: true,
          },
        }),
      maxRows,
    );

    return this.table(
      [
        { key: 'employeeCode', header: 'Employee code', width: 90 },
        { key: 'fullName', header: 'Name', width: 130 },
        { key: 'jobTitle', header: 'Job title', width: 90 },
        { key: 'status', header: 'Status', width: 70 },
        { key: 'joiningDate', header: 'Joining date', width: 80 },
      ],
      collected.rows.map((row) => ({
        employeeCode: row.employeeCode,
        fullName: fullName(row.firstName, row.lastName),
        jobTitle: present(row.jobTitle),
        status: row.status.replaceAll('_', ' '),
        joiningDate: formatDate(row.joiningDate),
      })),
      collected.totalMatches,
      collected.truncated,
    );
  }

  async attendanceRows(
    query: QueryAttendanceReportDto,
    maxRows: number,
  ): Promise<ExportTable> {
    const { start, end } = resolveReportPeriod(query.startDate, query.endDate);
    const where = this.attendance.where(query, start, end);
    const collected = await this.collect(
      () => this.prisma.attendance.count({ where }),
      (skip, take) =>
        this.prisma.attendance.findMany({
          where,
          skip,
          take,
          orderBy: [{ date: 'desc' }, { employee: { employeeCode: 'asc' } }],
          select: {
            date: true,
            status: true,
            checkIn: true,
            checkOut: true,
            workingMinutes: true,
            lateMinutes: true,
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      maxRows,
    );

    return this.table(
      [
        { key: 'date', header: 'Date', width: 70 },
        { key: 'employeeCode', header: 'Employee code', width: 80 },
        { key: 'fullName', header: 'Name', width: 110 },
        { key: 'status', header: 'Status', width: 70 },
        { key: 'checkIn', header: 'Check in', width: 55 },
        { key: 'checkOut', header: 'Check out', width: 55 },
        { key: 'hours', header: 'Hours', width: 45 },
        { key: 'lateMinutes', header: 'Late min', width: 50 },
      ],
      collected.rows.map((row) => ({
        date: formatDate(row.date),
        employeeCode: row.employee.employeeCode,
        fullName: fullName(row.employee.firstName, row.employee.lastName),
        status: toPublicStatus(row.status).replaceAll('_', ' '),
        checkIn: formatTime(row.checkIn),
        checkOut: formatTime(row.checkOut),
        hours: String(minutesToHours(row.workingMinutes ?? 0)),
        lateMinutes: String(row.lateMinutes ?? 0),
      })),
      collected.totalMatches,
      collected.truncated,
    );
  }

  async leaveRows(
    query: QueryLeaveReportDto,
    maxRows: number,
  ): Promise<ExportTable> {
    const { start, end } = resolveReportPeriod(query.startDate, query.endDate);
    const where = this.leave.where(query, start, end);
    const collected = await this.collect(
      () => this.prisma.leave.count({ where }),
      (skip, take) =>
        this.prisma.leave.findMany({
          where,
          skip,
          take,
          orderBy: [
            { startDate: 'desc' },
            { employee: { employeeCode: 'asc' } },
          ],
          select: {
            leaveType: true,
            startDate: true,
            endDate: true,
            totalDays: true,
            status: true,
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      maxRows,
    );

    return this.table(
      [
        { key: 'employeeCode', header: 'Employee code', width: 80 },
        { key: 'fullName', header: 'Name', width: 120 },
        { key: 'leaveType', header: 'Leave type', width: 80 },
        { key: 'startDate', header: 'Start', width: 70 },
        { key: 'endDate', header: 'End', width: 70 },
        { key: 'days', header: 'Days', width: 40 },
        { key: 'status', header: 'Status', width: 70 },
      ],
      collected.rows.map((row) => ({
        employeeCode: row.employee.employeeCode,
        fullName: fullName(row.employee.firstName, row.employee.lastName),
        leaveType: row.leaveType.replaceAll('_', ' '),
        startDate: formatDate(row.startDate),
        endDate: formatDate(row.endDate),
        days: String(row.totalDays),
        status: row.status.replaceAll('_', ' '),
      })),
      collected.totalMatches,
      collected.truncated,
    );
  }

  async payrollRows(
    query: QueryPayrollReportDto,
    maxRows: number,
  ): Promise<ExportTable> {
    const where = this.payroll.moneyWhere(query);
    const collected = await this.collect(
      () => this.prisma.payrollRecord.count({ where }),
      (skip, take) =>
        this.prisma.payrollRecord.findMany({
          where,
          skip,
          take,
          orderBy: [
            { payrollYear: 'desc' },
            { payrollMonth: 'desc' },
            { employee: { employeeCode: 'asc' } },
          ],
          select: {
            payrollMonth: true,
            payrollYear: true,
            basicSalary: true,
            allowances: true,
            overtimeAmount: true,
            unpaidLeaveDeduction: true,
            deductions: true,
            otherDeductions: true,
            grossSalary: true,
            netSalary: true,
            paymentStatus: true,
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      maxRows,
    );

    return this.table(
      [
        { key: 'employeeCode', header: 'Employee code', width: 80 },
        { key: 'fullName', header: 'Name', width: 110 },
        { key: 'period', header: 'Period', width: 55 },
        { key: 'gross', header: 'Gross', width: 60 },
        { key: 'deductions', header: 'Deductions', width: 70 },
        { key: 'net', header: 'Net', width: 60 },
        { key: 'status', header: 'Status', width: 70 },
      ],
      collected.rows.map((row) => ({
        employeeCode: row.employee.employeeCode,
        fullName: fullName(row.employee.firstName, row.employee.lastName),
        period: periodLabel(row.payrollMonth, row.payrollYear),
        gross: formatMoney(roundMoney(row.grossSalary)),
        deductions: formatMoney(
          roundMoney(
            Number(row.deductions) +
              Number(row.unpaidLeaveDeduction) +
              Number(row.otherDeductions),
          ),
        ),
        net: formatMoney(roundMoney(row.netSalary)),
        status: row.paymentStatus.replaceAll('_', ' '),
      })),
      collected.totalMatches,
      collected.truncated,
    );
  }

  async invoiceRows(
    query: QueryInvoiceReportDto,
    maxRows: number,
  ): Promise<ExportTable> {
    const { start, end } = resolveReportPeriod(query.startDate, query.endDate);
    const where = this.invoices.where(query, start, end);
    const collected = await this.collect(
      () => this.prisma.invoice.count({ where }),
      (skip, take) =>
        this.prisma.invoice.findMany({
          where,
          skip,
          take,
          orderBy: [{ invoiceDate: 'desc' }, { invoiceNumber: 'asc' }],
          select: {
            invoiceNumber: true,
            customerName: true,
            invoiceDate: true,
            dueDate: true,
            status: true,
            subtotal: true,
            taxAmount: true,
            discountAmount: true,
            totalAmount: true,
          },
        }),
      maxRows,
    );

    return this.table(
      [
        { key: 'invoiceNumber', header: 'Invoice no.', width: 90 },
        { key: 'customerName', header: 'Customer', width: 110 },
        { key: 'invoiceDate', header: 'Invoice date', width: 70 },
        { key: 'dueDate', header: 'Due date', width: 70 },
        { key: 'status', header: 'Status', width: 80 },
        { key: 'subtotal', header: 'Subtotal', width: 60 },
        { key: 'total', header: 'Total', width: 60 },
      ],
      collected.rows.map((row) => ({
        invoiceNumber: row.invoiceNumber,
        customerName: row.customerName,
        invoiceDate: formatDate(row.invoiceDate),
        dueDate: formatDate(row.dueDate),
        status: row.status.replaceAll('_', ' '),
        subtotal: formatMoney(roundMoney(row.subtotal)),
        total: formatMoney(roundMoney(row.totalAmount)),
      })),
      collected.totalMatches,
      collected.truncated,
    );
  }

  async documentRows(
    query: QueryDocumentReportDto,
    maxRows: number,
  ): Promise<ExportTable> {
    const where = this.documents.where(query);
    const warningDays = await this.documents.warningDays();
    const today = calendarDate();
    const collected = await this.collect(
      () => this.prisma.document.count({ where }),
      (skip, take) =>
        this.prisma.document.findMany({
          where,
          skip,
          take,
          orderBy: [
            { expiryDate: 'asc' },
            { employee: { employeeCode: 'asc' } },
          ],
          select: {
            documentType: true,
            issueDate: true,
            expiryDate: true,
            employee: {
              select: {
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      maxRows,
    );

    return this.table(
      [
        { key: 'employeeCode', header: 'Employee code', width: 80 },
        { key: 'fullName', header: 'Name', width: 120 },
        { key: 'documentType', header: 'Document type', width: 100 },
        { key: 'issueDate', header: 'Issue date', width: 70 },
        { key: 'expiryDate', header: 'Expiry date', width: 70 },
        { key: 'status', header: 'Status', width: 80 },
      ],
      collected.rows.map((row) => ({
        employeeCode: row.employee.employeeCode,
        fullName: fullName(row.employee.firstName, row.employee.lastName),
        documentType: toPublicDocumentType(row.documentType).replaceAll(
          '_',
          ' ',
        ),
        issueDate: formatDate(row.issueDate),
        expiryDate: formatDate(row.expiryDate),
        status: calculateExpiryStatus(
          row.expiryDate,
          today,
          warningDays,
        ).replaceAll('_', ' '),
      })),
      collected.totalMatches,
      collected.truncated,
    );
  }

  async collect<T>(
    count: () => Promise<number>,
    fetch: (skip: number, take: number) => Promise<T[]>,
    maxRows: number,
  ): Promise<{ rows: T[]; truncated: boolean; totalMatches: number }> {
    const totalMatches = await count();
    const limit = Math.min(totalMatches, maxRows);
    const rows: T[] = [];
    let skip = 0;

    while (skip < limit) {
      const take = Math.min(EXPORT_BATCH_SIZE, limit - skip);
      const batch = await fetch(skip, take);
      if (batch.length === 0) {
        break;
      }
      rows.push(...batch);
      skip += batch.length;
      if (batch.length < take) {
        break;
      }
    }

    return {
      rows,
      truncated: totalMatches > rows.length,
      totalMatches,
    };
  }

  private table(
    columns: ExportColumn[],
    rows: Array<Record<string, string>>,
    totalMatches: number,
    truncated: boolean,
  ): ExportTable {
    return {
      columns,
      rows,
      truncated,
      totalMatches,
      includedRows: rows.length,
    };
  }
}
