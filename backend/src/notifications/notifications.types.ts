import { NotificationType } from '@prisma/client';
import { DocumentExpiryAlert } from '../documents/document-expiry';

export const PUBLIC_NOTIFICATION_TYPES = [
  'DOCUMENT_EXPIRING',
  'DOCUMENT_EXPIRED',
  'LEAVE_APPROVED',
  'LEAVE_REJECTED',
  'ATTENDANCE_ALERT',
] as const;

export type PublicNotificationType = (typeof PUBLIC_NOTIFICATION_TYPES)[number];

export interface NotificationEmployeeSummary {
  id: string;
  employeeCode: string;
  fullName: string;
}

export interface NotificationDocumentSummary {
  id: string;
  documentType: string;
  expiryDate: string | null;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  employee: NotificationEmployeeSummary | null;
  document: NotificationDocumentSummary | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface PaginatedNotifications {
  data: NotificationResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface ExpiryAlertItem {
  documentId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  documentType: string;
  expiryDate: string;
  bucket: DocumentExpiryAlert;
}

export interface ExpiryAlertsResponse {
  expired: ExpiryAlertItem[];
  expiringUrgent: ExpiryAlertItem[];
  expiringSoon: ExpiryAlertItem[];
  urgentDays: number;
  warningDays: number;
}
