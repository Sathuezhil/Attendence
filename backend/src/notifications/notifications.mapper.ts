import { Document, Employee, Notification } from '@prisma/client';
import { toDateOnly } from '../attendance/working-hours';
import { toPublicDocumentType } from '../documents/documents.mapper';
import {
  NotificationDocumentSummary,
  NotificationEmployeeSummary,
  NotificationResponse,
} from './notifications.types';

type NotificationRecord = Notification & {
  employee: Pick<
    Employee,
    'id' | 'employeeCode' | 'firstName' | 'lastName'
  > | null;
  document: Pick<Document, 'id' | 'documentType' | 'expiryDate'> | null;
};

export function toNotificationResponse(
  record: NotificationRecord,
): NotificationResponse {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message,
    employee: record.employee ? toEmployee(record.employee) : null,
    document: record.document ? toDocument(record.document) : null,
    isRead: record.isRead,
    createdAt: record.createdAt.toISOString(),
    readAt: record.readAt ? record.readAt.toISOString() : null,
  };
}

function toEmployee(
  employee: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName'>,
): NotificationEmployeeSummary {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
  };
}

function toDocument(
  document: Pick<Document, 'id' | 'documentType' | 'expiryDate'>,
): NotificationDocumentSummary {
  return {
    id: document.id,
    documentType: toPublicDocumentType(document.documentType),
    expiryDate: document.expiryDate ? toDateOnly(document.expiryDate) : null,
  };
}
