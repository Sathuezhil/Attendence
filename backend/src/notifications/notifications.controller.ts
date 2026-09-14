import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';
import {
  NotificationResponse,
  PaginatedNotifications,
  UnreadCountResponse,
} from './notifications.types';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Query() query: QueryNotificationsDto,
  ): Promise<PaginatedNotifications> {
    return this.notificationsService.list(query);
  }

  @Get('unread-count')
  unreadCount(): Promise<UnreadCountResponse> {
    return this.notificationsService.unreadCount();
  }

  @Patch('read-all')
  markAllRead(): Promise<{ count: number }> {
    return this.notificationsService.markAllRead();
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponse> {
    return this.notificationsService.markRead(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: true }> {
    return this.notificationsService.remove(id);
  }
}
