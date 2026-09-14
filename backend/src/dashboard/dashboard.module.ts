import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AttendanceModule, DocumentsModule, NotificationsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
