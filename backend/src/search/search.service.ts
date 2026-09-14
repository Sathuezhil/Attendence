import { Injectable } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { DocumentsService } from '../documents/documents.service';
import { EmployeesService } from '../employees/employees.service';
import { InvoicesService } from '../invoices/invoices.service';
import { LeaveService } from '../leave/leave.service';
import { PayrollService } from '../payroll/payroll.service';
import { QuerySearchDto } from './dto/query-search.dto';
import { SearchCategory, SearchResponse } from './search.types';

const EMPTY = { total: 0, data: [] };

@Injectable()
export class SearchService {
  constructor(
    private readonly employees: EmployeesService,
    private readonly attendance: AttendanceService,
    private readonly leave: LeaveService,
    private readonly documents: DocumentsService,
    private readonly payroll: PayrollService,
    private readonly invoices: InvoicesService,
  ) {}

  async search(query: QuerySearchDto): Promise<SearchResponse> {
    const q = query.q?.trim() ?? '';
    const limit = query.limit ?? 8;

    if (!q && !this.hasFilters(query)) {
      return {
        query: q,
        employees: EMPTY,
        attendance: EMPTY,
        leave: EMPTY,
        documents: EMPTY,
        payroll: EMPTY,
        invoices: EMPTY,
      };
    }

    const [employees, attendance, leave, documents, payroll, invoices] =
      await Promise.all([
        this.shouldSearch(
          q,
          query.employeeStatus ||
            query.jobTitle ||
            query.joiningFrom ||
            query.joiningTo,
        )
          ? this.employees.findAll({
              search: q || undefined,
              employmentStatus: query.employeeStatus,
              jobTitle: query.jobTitle,
              joiningFrom: query.joiningFrom,
              joiningTo: query.joiningTo,
              page: 1,
              limit,
            })
          : EMPTY,
        this.shouldSearch(
          q,
          query.employeeId ||
            query.startDate ||
            query.endDate ||
            query.attendanceStatus ||
            query.lateOnly ||
            query.absentOnly,
        )
          ? this.attendance.findAll({
              search: q || undefined,
              employeeId: query.employeeId,
              startDate: query.startDate,
              endDate: query.endDate,
              status: query.attendanceStatus,
              lateOnly: query.lateOnly,
              absentOnly: query.absentOnly,
              page: 1,
              limit,
            })
          : EMPTY,
        this.shouldSearch(
          q,
          query.employeeId ||
            query.leaveType ||
            query.leaveStatus ||
            query.startDate ||
            query.endDate,
        )
          ? this.leave.findAll({
              search: q || undefined,
              employeeId: query.employeeId,
              leaveType: query.leaveType,
              status: query.leaveStatus,
              startDate: query.startDate,
              endDate: query.endDate,
              page: 1,
              limit,
            })
          : EMPTY,
        this.shouldSearch(
          q,
          query.employeeId ||
            query.documentType ||
            query.expiryStatus ||
            query.expiryFrom ||
            query.expiryTo,
        )
          ? this.documents.list({
              search: q || undefined,
              employeeId: query.employeeId,
              documentType: query.documentType,
              expiryStatus: query.expiryStatus,
              expiryFrom: query.expiryFrom,
              expiryTo: query.expiryTo,
              page: 1,
              limit,
            })
          : EMPTY,
        this.shouldSearch(
          q,
          query.employeeId || query.month || query.year || query.paymentStatus,
        )
          ? this.payroll.findAll({
              search: q || undefined,
              employeeId: query.employeeId,
              month: query.month,
              year: query.year,
              paymentStatus: query.paymentStatus,
              page: 1,
              limit,
            })
          : EMPTY,
        this.shouldSearch(
          q,
          query.customer ||
            query.invoiceNumber ||
            query.invoiceStatus ||
            query.fromDate ||
            query.toDate ||
            query.dueFrom ||
            query.dueTo,
        )
          ? this.invoices.findAll({
              search: q || undefined,
              customer: query.customer,
              invoiceNumber: query.invoiceNumber,
              status: query.invoiceStatus,
              fromDate: query.fromDate,
              toDate: query.toDate,
              dueFrom: query.dueFrom,
              dueTo: query.dueTo,
              page: 1,
              limit,
            })
          : EMPTY,
      ]);

    return {
      query: q,
      employees: this.category(employees.total, employees.data, (item) => ({
        id: item.id,
        employeeCode: item.employeeCode,
        fullName: item.fullName,
        jobTitle: item.jobTitle,
        status: item.employmentStatus,
      })),
      attendance: this.category(attendance.total, attendance.data, (item) => ({
        id: item.id,
        date: item.attendanceDate,
        status: item.status,
        employeeCode: item.employee.employeeCode,
        fullName: item.employee.fullName,
      })),
      leave: this.category(leave.total, leave.data, (item) => ({
        id: item.id,
        leaveType: item.leaveType,
        status: item.status,
        startDate: item.startDate,
        endDate: item.endDate,
        employeeCode: item.employee.employeeCode,
        fullName: item.employee.fullName,
      })),
      documents: this.category(documents.total, documents.data, (item) => ({
        id: item.id,
        documentType: item.documentType,
        expiryStatus: item.expiryStatus,
        expiryDate: item.expiryDate,
        employeeCode: item.employee.employeeCode,
        fullName: item.employee.fullName,
      })),
      payroll: this.category(payroll.total, payroll.data, (item) => ({
        id: item.id,
        employeeCode: item.employee.employeeCode,
        fullName: item.employee.fullName,
        month: item.payrollMonth,
        year: item.payrollYear,
        paymentStatus: item.paymentStatus,
      })),
      invoices: this.category(invoices.total, invoices.data, (item) => ({
        id: item.id,
        invoiceNumber: item.invoiceNumber,
        customerName: item.customerName,
        status: item.status,
        invoiceDate: item.invoiceDate,
        dueDate: item.dueDate,
      })),
    };
  }

  private category<T, R>(
    total: number,
    rows: T[],
    map: (row: T) => R,
  ): SearchCategory<R> {
    return { total, data: rows.map(map) };
  }

  private shouldSearch(q: string, relevantFilters: unknown): boolean {
    return Boolean(q || relevantFilters);
  }

  private hasFilters(query: QuerySearchDto): boolean {
    return Boolean(
      query.employeeStatus ||
      query.jobTitle ||
      query.joiningFrom ||
      query.joiningTo ||
      query.employeeId ||
      query.startDate ||
      query.endDate ||
      query.attendanceStatus ||
      query.lateOnly ||
      query.absentOnly ||
      query.leaveType ||
      query.leaveStatus ||
      query.documentType ||
      query.expiryStatus ||
      query.expiryFrom ||
      query.expiryTo ||
      query.month ||
      query.year ||
      query.paymentStatus ||
      query.customer ||
      query.invoiceNumber ||
      query.invoiceStatus ||
      query.fromDate ||
      query.toDate ||
      query.dueFrom ||
      query.dueTo,
    );
  }
}
