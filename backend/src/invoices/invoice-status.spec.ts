import { InvoiceStatus } from '@prisma/client';
import {
  canCancelInvoice,
  canEditInvoice,
  canMarkInvoicePaid,
  canSendInvoice,
  resolveInvoiceStatus,
  statusAfterSend,
} from './invoice-status';

describe('invoice status', () => {
  const today = new Date('2026-09-14T00:00:00.000Z');

  it('marks sent invoices overdue after the due date without creating a new record', () => {
    expect(
      resolveInvoiceStatus(
        InvoiceStatus.SENT,
        new Date('2026-09-01T00:00:00.000Z'),
        today,
      ),
    ).toBe(InvoiceStatus.OVERDUE);
  });

  it('does not change paid, cancelled, or draft invoices', () => {
    const due = new Date('2026-09-01T00:00:00.000Z');
    expect(resolveInvoiceStatus(InvoiceStatus.PAID, due, today)).toBe(
      InvoiceStatus.PAID,
    );
    expect(resolveInvoiceStatus(InvoiceStatus.CANCELLED, due, today)).toBe(
      InvoiceStatus.CANCELLED,
    );
    expect(resolveInvoiceStatus(InvoiceStatus.DRAFT, due, today)).toBe(
      InvoiceStatus.DRAFT,
    );
  });

  it('sends a past-due draft as overdue', () => {
    expect(statusAfterSend(new Date('2026-09-01T00:00:00.000Z'), today)).toBe(
      InvoiceStatus.OVERDUE,
    );
    expect(statusAfterSend(new Date('2026-09-20T00:00:00.000Z'), today)).toBe(
      InvoiceStatus.SENT,
    );
  });

  it('limits status transitions', () => {
    expect(canSendInvoice(InvoiceStatus.DRAFT)).toBe(true);
    expect(canSendInvoice(InvoiceStatus.SENT)).toBe(false);
    expect(canEditInvoice(InvoiceStatus.PAID)).toBe(false);
    expect(canMarkInvoicePaid(InvoiceStatus.CANCELLED)).toBe(false);
    expect(canCancelInvoice(InvoiceStatus.PAID)).toBe(false);
  });
});
