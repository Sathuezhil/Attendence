import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfiguration } from '../config/configuration';
import { InvoicesService } from './invoices.service';

@Injectable()
export class InvoiceOverdueScheduler implements OnModuleInit {
  private readonly logger = new Logger(InvoiceOverdueScheduler.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('invoiceOverdueCheckOnBoot', { infer: true })) {
      return;
    }

    await this.safeRun('boot');
  }

  @Cron(process.env.INVOICE_OVERDUE_CRON ?? CronExpression.EVERY_DAY_AT_8AM, {
    name: 'invoice-overdue-check',
    timeZone: process.env.INVOICE_OVERDUE_TIMEZONE ?? 'UTC',
  })
  async handleDailyCheck(): Promise<void> {
    await this.safeRun('scheduled');
  }

  private async safeRun(reason: string): Promise<void> {
    try {
      const updated = await this.invoicesService.markOverdueInvoices();
      this.logger.log(`Overdue check (${reason}) marked ${updated} invoice(s)`);
    } catch (error) {
      this.logger.error(`Invoice overdue check failed (${reason})`, error);
    }
  }
}
