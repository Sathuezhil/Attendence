import { apiRequest } from '@/lib/api';
import {
  Invoice,
  InvoicePreview,
  InvoiceStatus,
  InvoiceWritePayload,
  PaginatedInvoices,
} from './types';

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  customer?: string;
  fromDate?: string;
  toDate?: string;
}

function toQuery(params: InvoiceListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

export function fetchInvoices(params: InvoiceListParams = {}): Promise<PaginatedInvoices> {
  return apiRequest<PaginatedInvoices>(`/invoices${toQuery(params)}`);
}

export function fetchInvoice(id: string): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}`);
}

export function previewInvoice(payload: InvoiceWritePayload): Promise<InvoicePreview> {
  return apiRequest<InvoicePreview>('/invoices/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createInvoice(payload: InvoiceWritePayload): Promise<Invoice> {
  return apiRequest<Invoice>('/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateInvoice(id: string, payload: Partial<InvoiceWritePayload>): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function sendInvoice(id: string): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}/send`, { method: 'POST' });
}

export function markInvoicePaid(id: string): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}/mark-paid`, { method: 'POST' });
}

export function cancelInvoice(id: string): Promise<Invoice> {
  return apiRequest<Invoice>(`/invoices/${id}/cancel`, { method: 'POST' });
}
