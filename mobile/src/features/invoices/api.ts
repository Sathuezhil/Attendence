import { ApiError } from '@/lib/api';
import {
  asDateOnlyRequired,
  asIso,
  asNumber,
  asString,
  asStringOrNull,
  createRecord,
  getById,
  includesInsensitive,
  listCollection,
  paginate,
  removeRecord,
  todayUtc,
  updateRecord,
  writeAudit,
} from '@/lib/data';
import { loadSettings } from '@/lib/domain';
import { previewInvoiceLocally } from './calculate';
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
  dueFrom?: string;
  dueTo?: string;
  invoiceNumber?: string;
}

const OPEN_STATUSES = new Set(['SENT', 'PARTIALLY_PAID', 'OVERDUE']);

function resolveStatus(status: string, dueDate: string): InvoiceStatus {
  if (status === 'PAID' || status === 'CANCELLED' || status === 'DRAFT') {
    return status;
  }
  if (dueDate < todayUtc()) {
    return 'OVERDUE';
  }
  return status === 'OVERDUE' ? 'SENT' : (status as InvoiceStatus);
}

function mapItem(row: Record<string, unknown> & { id: string }) {
  return {
    id: row.id,
    description: asString(row.description),
    quantity: asNumber(row.quantity),
    unitPrice: asNumber(row.unitPrice),
    taxRate: asNumber(row.taxRate),
    discount: asNumber(row.discount),
    lineTotal: asNumber(row.lineTotal),
  };
}

async function loadItems(invoiceId: string) {
  const items = await listCollection('invoice_items');
  return items.filter((row) => asString(row.invoiceId) === invoiceId).map(mapItem);
}

async function mapInvoice(row: Record<string, unknown> & { id: string }): Promise<Invoice> {
  const settings = await loadSettings();
  const dueDate = asDateOnlyRequired(row.dueDate);
  const status = resolveStatus(asString(row.status, 'DRAFT'), dueDate);
  return {
    id: row.id,
    invoiceNumber: asString(row.invoiceNumber),
    customerName: asString(row.customerName),
    customerEmail: asStringOrNull(row.customerEmail),
    customerPhone: asStringOrNull(row.customerPhone),
    customerAddress: asStringOrNull(row.customerAddress),
    invoiceDate: asDateOnlyRequired(row.invoiceDate),
    dueDate,
    status,
    subtotal: asNumber(row.subtotal),
    taxAmount: asNumber(row.taxAmount),
    discountAmount: asNumber(row.discountAmount),
    totalAmount: asNumber(row.totalAmount),
    notes: asStringOrNull(row.notes),
    items: await loadItems(row.id),
    company: {
      name: settings.company.name || null,
      email: settings.company.email || null,
      phone: settings.company.phone || null,
      address: settings.company.address || null,
    },
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;
  const invoices = await listCollection('invoices');
  let max = 0;
  for (const row of invoices) {
    const number = asString(row.invoiceNumber);
    if (number.startsWith(prefix)) {
      const parsed = Number(number.slice(prefix.length));
      if (Number.isFinite(parsed)) {
        max = Math.max(max, parsed);
      }
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

export async function fetchInvoices(params: InvoiceListParams = {}): Promise<PaginatedInvoices> {
  const search = params.search?.trim() ?? '';
  let rows = await Promise.all((await listCollection('invoices')).map(mapInvoice));
  if (params.status) rows = rows.filter((row) => row.status === params.status);
  if (params.customer) rows = rows.filter((row) => includesInsensitive(row.customerName, params.customer ?? ''));
  if (params.invoiceNumber) {
    rows = rows.filter((row) => includesInsensitive(row.invoiceNumber, params.invoiceNumber ?? ''));
  }
  if (params.fromDate) rows = rows.filter((row) => row.invoiceDate >= params.fromDate!);
  if (params.toDate) rows = rows.filter((row) => row.invoiceDate <= params.toDate!);
  if (params.dueFrom) rows = rows.filter((row) => row.dueDate >= params.dueFrom!);
  if (params.dueTo) rows = rows.filter((row) => row.dueDate <= params.dueTo!);
  if (search) {
    rows = rows.filter(
      (row) =>
        includesInsensitive(row.invoiceNumber, search) ||
        includesInsensitive(row.customerName, search),
    );
  }
  rows.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  return paginate(rows, params.page, params.limit);
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  return mapInvoice(await getById('invoices', id));
}

export function previewInvoice(payload: InvoiceWritePayload): Promise<InvoicePreview> {
  return Promise.resolve(previewInvoiceLocally(payload.items));
}

async function writeItems(invoiceId: string, payload: InvoiceWritePayload) {
  const preview = previewInvoiceLocally(payload.items);
  const existing = (await listCollection('invoice_items')).filter(
    (row) => asString(row.invoiceId) === invoiceId,
  );
  await Promise.all(existing.map((row) => removeRecord('invoice_items', row.id)));
  await Promise.all(
    preview.items.map((item) =>
      createRecord('invoice_items', {
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate ?? 0,
        discount: item.discount ?? 0,
        lineTotal: item.lineTotal,
      }),
    ),
  );
  return preview;
}

export async function createInvoice(payload: InvoiceWritePayload): Promise<Invoice> {
  const preview = previewInvoiceLocally(payload.items);
  const created = await createRecord('invoices', {
    invoiceNumber: await nextInvoiceNumber(),
    customerName: payload.customerName,
    customerEmail: payload.customerEmail ?? null,
    customerPhone: payload.customerPhone ?? null,
    customerAddress: payload.customerAddress ?? null,
    invoiceDate: payload.invoiceDate,
    dueDate: payload.dueDate,
    status: 'DRAFT',
    subtotal: preview.subtotal,
    taxAmount: preview.taxAmount,
    discountAmount: preview.discountAmount,
    totalAmount: preview.totalAmount,
    notes: payload.notes ?? null,
  });
  await writeItems(created.id, payload);
  await writeAudit('create', 'invoice', created.id);
  return fetchInvoice(created.id);
}

export async function updateInvoice(
  id: string,
  payload: Partial<InvoiceWritePayload>,
): Promise<Invoice> {
  const current = await fetchInvoice(id);
  if (current.status === 'PAID' || current.status === 'CANCELLED') {
    throw new ApiError('This invoice cannot be edited', 400);
  }
  const items = payload.items ?? current.items;
  const preview = previewInvoiceLocally(items);
  await updateRecord('invoices', id, {
    customerName: payload.customerName ?? current.customerName,
    customerEmail: payload.customerEmail ?? current.customerEmail,
    customerPhone: payload.customerPhone ?? current.customerPhone,
    customerAddress: payload.customerAddress ?? current.customerAddress,
    invoiceDate: payload.invoiceDate ?? current.invoiceDate,
    dueDate: payload.dueDate ?? current.dueDate,
    notes: payload.notes ?? current.notes,
    subtotal: preview.subtotal,
    taxAmount: preview.taxAmount,
    discountAmount: preview.discountAmount,
    totalAmount: preview.totalAmount,
  });
  if (payload.items) {
    await writeItems(id, {
      customerName: current.customerName,
      invoiceDate: current.invoiceDate,
      dueDate: current.dueDate,
      items: payload.items,
    });
  }
  await writeAudit('update', 'invoice', id);
  return fetchInvoice(id);
}

export async function sendInvoice(id: string): Promise<Invoice> {
  const invoice = await fetchInvoice(id);
  if (invoice.status !== 'DRAFT') {
    throw new ApiError('Only draft invoices can be sent', 400);
  }
  await updateRecord('invoices', id, {
    status: invoice.dueDate < todayUtc() ? 'OVERDUE' : 'SENT',
  });
  await writeAudit('send', 'invoice', id);
  return fetchInvoice(id);
}

export async function markInvoicePaid(id: string): Promise<Invoice> {
  const invoice = await fetchInvoice(id);
  if (invoice.status === 'CANCELLED') {
    throw new ApiError('Cancelled invoices cannot be marked paid', 400);
  }
  await updateRecord('invoices', id, { status: 'PAID' });
  await writeAudit('mark-paid', 'invoice', id);
  return fetchInvoice(id);
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  const invoice = await fetchInvoice(id);
  if (invoice.status === 'PAID') {
    throw new ApiError('Paid invoices cannot be cancelled', 400);
  }
  await updateRecord('invoices', id, { status: 'CANCELLED' });
  await writeAudit('cancel', 'invoice', id);
  return fetchInvoice(id);
}

export { OPEN_STATUSES };
