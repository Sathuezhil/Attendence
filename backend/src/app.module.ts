import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { BackupsModule } from './backups/backups.module';
import configuration from './config/configuration';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { InvoicesModule } from './invoices/invoices.module';
import { LeaveModule } from './leave/leave.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PayrollModule } from './payroll/payroll.module';
import { PassportsModule } from './passports/passports.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { VisasModule } from './visas/visas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    AttendanceModule,
    LeaveModule,
    PassportsModule,
    VisasModule,
    DocumentsModule,
    NotificationsModule,
    PayrollModule,
    InvoicesModule,
    ReportsModule,
    BackupsModule,
    DashboardModule,
  ],
})
export class AppModule {}
