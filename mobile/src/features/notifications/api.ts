import { apiRequest } from '@/lib/api';
import {
  AppNotification,
  ExpiryAlertsResponse,
  NotificationType,
  PaginatedNotifications,
  UnreadCountResponse,
} from './types';

export interface NotificationListParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

function toQuery(params: NotificationListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function fetchNotifications(
  params: NotificationListParams = {},
): Promise<PaginatedNotifications> {
  return apiRequest<PaginatedNotifications>(`/notifications${toQuery(params)}`);
}

export function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return apiRequest<UnreadCountResponse>('/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return apiRequest<AppNotification>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead(): Promise<{ count: number }> {
  return apiRequest<{ count: number }>('/notifications/read-all', {
    method: 'PATCH',
  });
}

export function deleteNotification(id: string): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/notifications/${id}`, {
    method: 'DELETE',
  });
}

export function fetchExpiryAlerts(): Promise<ExpiryAlertsResponse> {
  return apiRequest<ExpiryAlertsResponse>('/dashboard/expiry-alerts');
}
