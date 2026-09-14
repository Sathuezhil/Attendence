import { NotificationType } from '@prisma/client';
import { toDateOnly } from '../attendance/working-hours';
import {
  daysUntilExpiry,
  ExpiryThresholds,
} from '../documents/document-expiry';
import { toPublicDocumentType } from '../documents/documents.mapper';
import { NotificationDraft } from './notification-channel';

export interface ExpiryDocumentInput {
  id: string;
  employeeId: string;
  documentType: Parameters<typeof toPublicDocumentType>[0];
  expiryDate: Date;
  employee: {
    firstName: string;
    lastName: string;
  };
}

export function expiryEventKey(
  kind: 'expired' | 'urgent' | 'soon',
  documentId: string,
  expiryDate: Date,
): string {
  return `document:${documentId}:${kind}:${toDateOnly(expiryDate)}`;
}

export function labelDocumentType(
  type: Parameters<typeof toPublicDocumentType>[0],
): string {
  return toPublicDocumentType(type).replaceAll('_', ' ');
}

export function employeeDisplayName(employee: {
  firstName: string;
  lastName: string;
}): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export function buildExpiryNotificationDrafts(
  documents: ExpiryDocumentInput[],
  today: Date,
  thresholds: ExpiryThresholds,
): NotificationDraft[] {
  const drafts: NotificationDraft[] = [];

  for (const document of documents) {
    const days = daysUntilExpiry(document.expiryDate, today);
    const typeLabel = labelDocumentType(document.documentType);
    const name = employeeDisplayName(document.employee);
    const expiry = toDateOnly(document.expiryDate);

    if (days < 0) {
      drafts.push({
        type: NotificationType.DOCUMENT_EXPIRED,
        title: 'Document expired',
        message: `${typeLabel} for ${name} expired on ${expiry}.`,
        employeeId: document.employeeId,
        documentId: document.id,
        eventKey: expiryEventKey('expired', document.id, document.expiryDate),
      });
      continue;
    }

    if (days <= thresholds.warningDays) {
      drafts.push({
        type: NotificationType.DOCUMENT_EXPIRING,
        title: 'Document expiring soon',
        message: `${typeLabel} for ${name} expires on ${expiry}.`,
        employeeId: document.employeeId,
        documentId: document.id,
        eventKey: expiryEventKey('soon', document.id, document.expiryDate),
      });
    }

    if (days <= thresholds.urgentDays) {
      drafts.push({
        type: NotificationType.DOCUMENT_EXPIRING,
        title: 'Document expiring urgently',
        message: `${typeLabel} for ${name} expires on ${expiry}.`,
        employeeId: document.employeeId,
        documentId: document.id,
        eventKey: expiryEventKey('urgent', document.id, document.expiryDate),
      });
    }
  }

  return drafts;
}
