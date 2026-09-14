import { Module } from '@nestjs/common';
import { DocumentExpiryScheduler } from './document-expiry.scheduler';
import { DocumentExpiryService } from './document-expiry.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    DocumentExpiryService,
    DocumentExpiryScheduler,
  ],
  exports: [NotificationsService, DocumentExpiryService],
})
export class NotificationsModule {}
