import { Module } from '@nestjs/common';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollCalculationService],
  exports: [PayrollService, PayrollCalculationService],
})
export class PayrollModule {}
