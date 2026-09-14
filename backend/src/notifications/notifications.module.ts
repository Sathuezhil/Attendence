import { Module } from '@nestjs/common';
import { DocumentExpiryScheduler } from './document-expiry.scheduler';
import { DocumentExpiryService } from './document-expiry.service';
import { NotificationInboxService } from './notification-inbox.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationInboxService,
    DocumentExpiryService,
    DocumentExpiryScheduler,
  ],
  exports: [
    NotificationsService,
    NotificationInboxService,
    DocumentExpiryService,
  ],
})
export class NotificationsModule {}
