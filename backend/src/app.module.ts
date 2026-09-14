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
import { ExportsModule } from './exports/exports.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { SearchModule } from './search/search.module';
import { UsersModule } from './users/users.module';
import { VisasModule } from './visas/visas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? ['.env.production', '.env']
          : ['.env', '.env.development'],
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
    SettingsModule,
    PayrollModule,
    InvoicesModule,
    ReportsModule,
    SearchModule,
    ExportsModule,
    BackupsModule,
    DashboardModule,
  ],
})
export class AppModule {}
