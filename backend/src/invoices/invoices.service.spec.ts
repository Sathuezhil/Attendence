import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { InvoicesService } from './invoices.service';

const totals = {
  items: [
    {
      description: 'Consulting',
      quantity: 2,
      unitPrice: 100,
      taxRate: 5,
      discount: 0,
      lineSubtotal: 200,
      lineTax: 10,
      lineTotal: 210,
    },
  ],
  subtotal: 200,
  itemDiscountTotal: 0,
  itemTaxTotal: 10,
  invoiceTaxAmount: 0,
  invoiceDiscountAmount: 0,
  taxAmount: 10,
  discountAmount: 0,
  totalAmount: 210,
};

const invoice = {
  id: '33333333-3333-3333-3333-333333333333',
  invoiceNumber: 'INV-2026-0001',
  customerName: 'Acme LLC',
  customerEmail: 'billing@acme.test',
  customerPhone: '0501234567',
  customerAddress: 'Dubai',
  invoiceDate: new Date('2026-09-01T00:00:00.000Z'),
  dueDate: new Date('2026-09-30T00:00:00.000Z'),
  status: InvoiceStatus.DRAFT,
  subtotal: 200,
  taxAmount: 10,
  discountAmount: 0,
  totalAmount: 210,
  notes: null,
  createdAt: new Date('2026-09-14T08:00:00.000Z'),
  updatedAt: new Date('2026-09-14T08:00:00.000Z'),
  items: [
    {
      id: '44444444-4444-4444-4444-444444444444',
      invoiceId: '33333333-3333-3333-3333-333333333333',
      description: 'Consulting',
      quantity: 2,
      unitPrice: 100,
      taxRate: 5,
      discount: 0,
      lineTotal: 210,
      createdAt: new Date('2026-09-14T08:00:00.000Z'),
      updatedAt: new Date('2026-09-14T08:00:00.000Z'),
    },
  ],
};

const dto = {
  customerName: 'Acme LLC',
  customerEmail: 'billing@acme.test',
  customerPhone: '0501234567',
  customerAddress: 'Dubai',
  invoiceDate: '2026-09-01',
  dueDate: '2026-09-30',
  items: [
    { description: 'Consulting', quantity: 2, unitPrice: 100, taxRate: 5 },
  ],
};

describe('InvoicesService', () => {
  const prisma = {
    invoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    invoiceItem: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const calculation = {
    calculate: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'invoiceNumberPrefix') {
        return 'INV';
      }
      return {};
    }),
  };

  let service: InvoicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    calculation.calculate.mockReturnValue(totals);
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.invoice.create.mockResolvedValue(invoice);
    service = new InvoicesService(
      prisma as never,
      calculation as never,
      config as never,
    );
  });

  it('creates an invoice with backend-calculated totals', async () => {
    const result = await service.create(dto);

    expect(result.invoiceNumber).toBe('INV-2026-0001');
    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(10);
    expect(result.totalAmount).toBe(210);
    expect(result.status).toBe(InvoiceStatus.DRAFT);
    expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
    expect(calculation.calculate).toHaveBeenCalled();
  });

  it('creates unique sequential invoice numbers', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      invoiceNumber: 'INV-2026-0007',
    });

    await service.create(dto);

    const createCalls = prisma.invoice.create.mock.calls as Array<
      [{ data: { invoiceNumber: string } }]
    >;
    expect(createCalls[0][0].data.invoiceNumber).toBe('INV-2026-0008');
  });

  it('sends a draft invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.invoice.update.mockResolvedValue({
      ...invoice,
      status: InvoiceStatus.SENT,
    });

    const result = await service.send(invoice.id);
    expect(result.status).toBe(InvoiceStatus.SENT);
  });

  it('marks an invoice paid', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      ...invoice,
      status: InvoiceStatus.SENT,
    });
    prisma.invoice.update.mockResolvedValue({
      ...invoice,
      status: InvoiceStatus.PAID,
    });

    const result = await service.markPaid(invoice.id);
    expect(result.status).toBe(InvoiceStatus.PAID);
  });

  it('cancels instead of hard-deleting an invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.invoice.update.mockResolvedValue({
      ...invoice,
      status: InvoiceStatus.CANCELLED,
    });

    const result = await service.cancel(invoice.id);
    expect(result.status).toBe(InvoiceStatus.CANCELLED);
  });

  it('rejects paid invoice cancellation', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      ...invoice,
      status: InvoiceStatus.PAID,
    });

    await expect(service.cancel(invoice.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects editing a paid invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      ...invoice,
      status: InvoiceStatus.PAID,
    });

    await expect(
      service.update(invoice.id, { notes: 'nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 for a missing invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);

    await expect(service.findOne(invoice.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('filters invoices by search, status, customer and date range', async () => {
    prisma.invoice.count.mockResolvedValue(1);
    prisma.invoice.findMany.mockResolvedValue([invoice]);

    await service.findAll({
      search: 'Acme',
      status: InvoiceStatus.DRAFT,
      customer: 'Acme',
      fromDate: '2026-09-01',
      toDate: '2026-09-30',
      page: 1,
      limit: 20,
    });

    const listCalls = prisma.invoice.findMany.mock.calls as Array<
      [{ where: { status: InvoiceStatus } }]
    >;
    expect(listCalls[0][0].where.status).toBe(InvoiceStatus.DRAFT);
    expect(prisma.invoice.updateMany).toHaveBeenCalled();
  });

  it('marks overdue invoices in place', async () => {
    prisma.invoice.updateMany.mockResolvedValue({ count: 2 });
    await expect(service.markOverdueInvoices()).resolves.toBe(2);
  });
});
