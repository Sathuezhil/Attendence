import { Invoice, InvoiceItem } from '@prisma/client';
import { toDateOnly } from '../attendance/working-hours';
import { InvoiceCompanyInfo, InvoiceResponse } from './invoices.types';
import { toMoney } from './invoice-money';

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

export function toInvoiceResponse(
  invoice: InvoiceWithItems,
  company: InvoiceCompanyInfo | null,
): InvoiceResponse {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone,
    customerAddress: invoice.customerAddress,
    invoiceDate: toDateOnly(invoice.invoiceDate),
    dueDate: toDateOnly(invoice.dueDate),
    status: invoice.status,
    subtotal: toMoney(invoice.subtotal),
    taxAmount: toMoney(invoice.taxAmount),
    discountAmount: toMoney(invoice.discountAmount),
    totalAmount: toMoney(invoice.totalAmount),
    notes: invoice.notes,
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: toMoney(item.quantity),
      unitPrice: toMoney(item.unitPrice),
      taxRate: toMoney(item.taxRate),
      discount: toMoney(item.discount),
      lineTotal: toMoney(item.lineTotal),
    })),
    company,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
