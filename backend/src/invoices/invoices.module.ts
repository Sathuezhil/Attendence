import { Module } from '@nestjs/common';
import { InvoiceCalculationService } from './invoice-calculation.service';
import { InvoiceOverdueScheduler } from './invoice-overdue.scheduler';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoiceCalculationService,
    InvoiceOverdueScheduler,
  ],
  exports: [InvoicesService, InvoiceCalculationService],
})
export class InvoicesModule {}
