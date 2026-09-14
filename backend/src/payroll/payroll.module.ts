import { Module } from '@nestjs/common';
import { ExportFormatModule } from '../exports/export-format.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [ExportFormatModule, NotificationsModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollCalculationService],
  exports: [PayrollService, PayrollCalculationService],
})
export class PayrollModule {}
