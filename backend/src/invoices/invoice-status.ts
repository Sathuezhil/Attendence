import { InvoiceStatus } from '@prisma/client';
import { toDateOnly } from '../attendance/working-hours';

export const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

export const OPEN_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

export function todayUtcDate(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function isDueDatePassed(
  dueDate: Date,
  today = todayUtcDate(),
): boolean {
  return toDateOnly(dueDate) < toDateOnly(today);
}

export function resolveInvoiceStatus(
  status: InvoiceStatus,
  dueDate: Date,
  today = todayUtcDate(),
): InvoiceStatus {
  if (
    status === InvoiceStatus.PAID ||
    status === InvoiceStatus.CANCELLED ||
    status === InvoiceStatus.DRAFT
  ) {
    return status;
  }

  if (isDueDatePassed(dueDate, today)) {
    return InvoiceStatus.OVERDUE;
  }

  return status === InvoiceStatus.OVERDUE ? InvoiceStatus.SENT : status;
}

export function statusAfterSend(
  dueDate: Date,
  today = todayUtcDate(),
): InvoiceStatus {
  return isDueDatePassed(dueDate, today)
    ? InvoiceStatus.OVERDUE
    : InvoiceStatus.SENT;
}

export function canEditInvoice(status: InvoiceStatus): boolean {
  return (
    status === InvoiceStatus.DRAFT ||
    status === InvoiceStatus.SENT ||
    status === InvoiceStatus.OVERDUE ||
    status === InvoiceStatus.PARTIALLY_PAID
  );
}

export function canSendInvoice(status: InvoiceStatus): boolean {
  return status === InvoiceStatus.DRAFT;
}

export function canMarkInvoicePaid(status: InvoiceStatus): boolean {
  return status !== InvoiceStatus.CANCELLED;
}

export function canCancelInvoice(status: InvoiceStatus): boolean {
  return status !== InvoiceStatus.CANCELLED && status !== InvoiceStatus.PAID;
}
