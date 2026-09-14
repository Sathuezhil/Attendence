import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module';
import { AttendanceReportService } from './attendance-report.service';
import { DocumentReportService } from './document-report.service';
import { EmployeeReportService } from './employee-report.service';
import { InvoiceReportService } from './invoice-report.service';
import { LeaveReportService } from './leave-report.service';
import { PayrollReportService } from './payroll-report.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [InvoicesModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    EmployeeReportService,
    AttendanceReportService,
    LeaveReportService,
    PayrollReportService,
    InvoiceReportService,
    DocumentReportService,
  ],
  exports: [
    ReportsService,
    EmployeeReportService,
    AttendanceReportService,
    LeaveReportService,
    PayrollReportService,
    InvoiceReportService,
    DocumentReportService,
  ],
})
export class ReportsModule {}
