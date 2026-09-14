export const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceCompany {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  lineTotal: number;
}

export interface Invoice {
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
  items: InvoiceItem[];
  company: InvoiceCompany | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedInvoices {
  data: Invoice[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InvoiceItemWrite {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

export interface InvoiceWritePayload {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  invoiceDate: string;
  dueDate: string;
  notes?: string;
  taxAmount?: number;
  discountAmount?: number;
  items: InvoiceItemWrite[];
}

export interface InvoicePreview {
  items: Array<
    InvoiceItemWrite & {
      lineSubtotal: number;
      lineTax: number;
      lineTotal: number;
    }
  >;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}
