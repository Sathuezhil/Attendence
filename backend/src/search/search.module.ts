import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { DocumentsModule } from '../documents/documents.module';
import { EmployeesModule } from '../employees/employees.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { LeaveModule } from '../leave/leave.module';
import { PayrollModule } from '../payroll/payroll.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    EmployeesModule,
    AttendanceModule,
    LeaveModule,
    DocumentsModule,
    PayrollModule,
    InvoicesModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
