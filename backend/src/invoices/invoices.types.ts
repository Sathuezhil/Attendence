import { InvoiceStatus } from '@prisma/client';
import { INVOICE_STATUSES } from './invoice-status';

export const PUBLIC_INVOICE_STATUSES = INVOICE_STATUSES;

export type PublicInvoiceStatus = (typeof PUBLIC_INVOICE_STATUSES)[number];

export interface InvoiceCompanyInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface InvoiceItemResponse {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  lineTotal: number;
}

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes: string | null;
  items: InvoiceItemResponse[];
  company: InvoiceCompanyInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedInvoices {
  data: InvoiceResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InvoicePreview {
  items: Array<
    Omit<InvoiceItemResponse, 'id'> & {
      lineSubtotal: number;
      lineTax: number;
    }
  >;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}
