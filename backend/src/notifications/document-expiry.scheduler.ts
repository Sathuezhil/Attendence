import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfiguration } from '../config/configuration';
import { DocumentExpiryService } from './document-expiry.service';

@Injectable()
export class DocumentExpiryScheduler implements OnModuleInit {
  private readonly logger = new Logger(DocumentExpiryScheduler.name);

  constructor(
    private readonly documentExpiryService: DocumentExpiryService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('documentExpiryCheckOnBoot', { infer: true })) {
      return;
    }

    await this.safeRun('boot');
  }

  @Cron(process.env.DOCUMENT_EXPIRY_CRON ?? CronExpression.EVERY_DAY_AT_7AM, {
    name: 'document-expiry-check',
    timeZone: process.env.DOCUMENT_EXPIRY_TIMEZONE ?? 'UTC',
  })
  async handleDailyCheck(): Promise<void> {
    await this.safeRun('scheduled');
  }

  private async safeRun(reason: string): Promise<void> {
    try {
      const result = await this.documentExpiryService.runDailyCheck();
      this.logger.log(
        `Expiry check (${reason}) created ${result.created} notification(s) from ${result.examined} document(s)`,
      );
    } catch (error) {
      this.logger.error(`Document expiry check failed (${reason})`, error);
    }
  }
}
