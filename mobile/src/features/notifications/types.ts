export const NOTIFICATION_TYPES = [
  'DOCUMENT_EXPIRING',
  'DOCUMENT_EXPIRED',
  'LEAVE_APPROVED',
  'LEAVE_REJECTED',
  'ATTENDANCE_ALERT',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
}

export interface NotificationDocument {
  id: string;
  documentType: string;
  expiryDate: string | null;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  employee: NotificationEmployee | null;
  document: NotificationDocument | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  count: number;
}

export type ExpiryAlertBucket = 'EXPIRED' | 'URGENT_EXPIRY' | 'EXPIRING_SOON' | 'VALID' | 'NO_EXPIRY';

export interface ExpiryAlert {
  documentId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  documentType: string;
  expiryDate: string;
  bucket: ExpiryAlertBucket;
}

export interface ExpiryAlertsResponse {
  expired: ExpiryAlert[];
  expiringUrgent: ExpiryAlert[];
  expiringSoon: ExpiryAlert[];
  urgentDays: number;
  warningDays: number;
}
