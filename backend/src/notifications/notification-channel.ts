import { NotificationType } from '@prisma/client';

export interface NotificationDraft {
  type: NotificationType;
  title: string;
  message: string;
  employeeId?: string | null;
  documentId?: string | null;
  eventKey: string;
}

/**
 * In-app persistence is the only channel in this version.
 * A later push/email/SMS implementation can implement this port
 * without changing expiry-check or notification API code.
 */
export interface NotificationChannel {
  readonly name: string;
  send(draft: NotificationDraft): Promise<void>;
}
