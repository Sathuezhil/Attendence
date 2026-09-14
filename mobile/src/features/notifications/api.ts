import {
  asDateOnly,
  asIso,
  asIsoOrNull,
  asString,
  asStringOrNull,
  getById,
  listCollection,
  paginate,
  removeRecord,
  updateRecord,
} from '@/lib/data';
import { calculateExpiryAlert, loadSettings, toPublicDocumentType } from '@/lib/domain';
import { loadEmployeeMap } from '@/features/employees/api';
import {
  AppNotification,
  ExpiryAlert,
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

function mapNotification(
  row: Record<string, unknown> & { id: string },
  employees: Awaited<ReturnType<typeof loadEmployeeMap>>,
  documents: Map<string, Record<string, unknown> & { id: string }>,
): AppNotification {
  const employee = employees.get(asString(row.employeeId));
  const document = documents.get(asString(row.documentId));
  return {
    id: row.id,
    type: asString(row.type, 'SYSTEM') as NotificationType,
    title: asString(row.title),
    message: asString(row.message),
    employee: employee
      ? {
          id: employee.id,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
        }
      : null,
    document: document
      ? {
          id: document.id,
          documentType: toPublicDocumentType(asString(document.documentType)),
          expiryDate: asDateOnly(document.expiryDate),
        }
      : null,
    isRead: row.isRead === true,
    createdAt: asIso(row.createdAt),
    readAt: asIsoOrNull(row.readAt),
  };
}

export async function fetchNotifications(
  params: NotificationListParams = {},
): Promise<PaginatedNotifications> {
  const [employees, documents, rows] = await Promise.all([
    loadEmployeeMap(),
    listCollection('documents'),
    listCollection('notifications'),
  ]);
  const documentMap = new Map(documents.map((row) => [row.id, row]));
  let mapped = rows.map((row) => mapNotification(row, employees, documentMap));
  if (params.unreadOnly) {
    mapped = mapped.filter((row) => !row.isRead);
  }
  if (params.type) {
    mapped = mapped.filter((row) => row.type === params.type);
  }
  mapped.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(mapped, params.page, params.limit);
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const rows = await listCollection('notifications');
  return { count: rows.filter((row) => row.isRead !== true).length };
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  await updateRecord('notifications', id, {
    isRead: true,
    readAt: new Date().toISOString(),
  });
  const [result] = (await fetchNotifications({ limit: 500 })).data.filter((row) => row.id === id);
  if (!result) {
    const row = await getById('notifications', id);
    const employees = await loadEmployeeMap();
    return mapNotification(row, employees, new Map());
  }
  return result;
}

export async function markAllNotificationsRead(): Promise<{ count: number }> {
  const rows = await listCollection('notifications');
  const unread = rows.filter((row) => row.isRead !== true);
  await Promise.all(
    unread.map((row) =>
      updateRecord('notifications', row.id, { isRead: true, readAt: new Date().toISOString() }),
    ),
  );
  return { count: unread.length };
}

export async function deleteNotification(id: string): Promise<{ success: true }> {
  await removeRecord('notifications', id);
  return { success: true };
}

export async function fetchExpiryAlerts(): Promise<ExpiryAlertsResponse> {
  const settings = await loadSettings();
  const employees = await loadEmployeeMap();
  const documents = await listCollection('documents');
  const expired: ExpiryAlert[] = [];
  const expiringUrgent: ExpiryAlert[] = [];
  const expiringSoon: ExpiryAlert[] = [];

  for (const row of documents) {
    const employee = employees.get(asString(row.employeeId));
    const expiryDate = asDateOnly(row.expiryDate);
    if (!employee || !expiryDate) {
      continue;
    }
    const bucket = calculateExpiryAlert(
      expiryDate,
      settings.documents.expiryWarningDays,
      settings.documents.expiryUrgentDays,
    );
    const alert: ExpiryAlert = {
      documentId: row.id,
      employeeId: employee.id,
      employeeName: employee.fullName,
      employeeCode: employee.employeeCode,
      documentType: toPublicDocumentType(asString(row.documentType)),
      expiryDate,
      bucket,
    };
    if (bucket === 'EXPIRED') expired.push(alert);
    if (bucket === 'URGENT_EXPIRY') expiringUrgent.push(alert);
    if (bucket === 'EXPIRING_SOON') expiringSoon.push(alert);
  }

  return {
    expired,
    expiringUrgent,
    expiringSoon,
    urgentDays: settings.documents.expiryUrgentDays,
    warningDays: settings.documents.expiryWarningDays,
  };
}
