import { inflateSync } from 'zlib';
import { PdfService } from './pdf.service';
import { PayslipData, ReportExportDocument } from './export.types';
import { InvoiceResponse } from '../invoices/invoices.types';

function configService() {
  return {
    get: () => ({
      name: 'Acme LLC',
      email: 'billing@acme.test',
      phone: '555-0100',
      address: '1 Harbor Rd',
    }),
  };
}

function readablePdf(buffer: Buffer): string {
  const source = buffer.toString('latin1');
  const inflated = [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((match) => {
      try {
        return inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      } catch {
        return '';
      }
    })
    .join('\n');
  const hexText = [...inflated.matchAll(/<([0-9a-fA-F]+)>/g)]
    .map((match) => Buffer.from(match[1], 'hex').toString('utf8'))
    .join('');
  return `${source}\n${inflated}\n${hexText}`;
}

describe('PdfService', () => {
  const service = new PdfService(configService() as never);

  it('renders an empty report PDF with company name and totals', async () => {
    const document: ReportExportDocument = {
      title: 'Leave Report',
      fileStem: 'leave-report',
      generatedAt: '2026-09-14T08:00:00Z',
      filters: [{ label: 'Status', value: 'PENDING' }],
      summary: [{ label: 'Total requests', value: '0' }],
      table: {
        columns: [{ key: 'name', header: 'Name' }],
        rows: [],
        truncated: false,
        totalMatches: 0,
        includedRows: 0,
      },
    };

    const pdf = await service.report(document);
    const text = readablePdf(pdf);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(text).toContain('Acme LLC');
    expect(text).toContain('Leave Report');
  });

  it('renders an invoice PDF without internal ids', async () => {
    const invoiceId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const itemId = '11111111-2222-3333-4444-555555555555';
    const invoice: InvoiceResponse = {
      id: invoiceId,
      invoiceNumber: 'INV-2026-0001',
      customerName: 'Northwind',
      customerEmail: 'ap@northwind.test',
      customerPhone: null,
      customerAddress: '9 Market St',
      invoiceDate: '2026-09-01',
      dueDate: '2026-09-15',
      status: 'PAID',
      subtotal: 100,
      taxAmount: 5,
      discountAmount: 0,
      totalAmount: 105,
      notes: 'Net 14',
      items: [
        {
          id: itemId,
          description: 'Onsite support',
          quantity: 2,
          unitPrice: 50,
          taxRate: 5,
          discount: 0,
          lineTotal: 105,
        },
      ],
      company: {
        name: 'Acme LLC',
        email: 'billing@acme.test',
        phone: '555-0100',
        address: '1 Harbor Rd',
      },
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const pdf = await service.invoice(invoice);
    const text = readablePdf(pdf);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(text).toContain('INV-2026-0001');
    expect(text).toContain('Northwind');
    expect(text).toContain('Onsite support');
    expect(text).not.toContain(invoiceId);
    expect(text).not.toContain(itemId);
  });

  it('renders a payslip without an employee UUID', async () => {
    const payslip: PayslipData = {
      employeeCode: 'EMP-01',
      fullName: 'Ada Lovelace',
      jobTitle: 'Engineer',
      payrollMonth: 9,
      payrollYear: 2026,
      basicSalary: 3000,
      allowances: 200,
      overtimeAmount: 50,
      unpaidLeaveDays: 1,
      unpaidLeaveDeduction: 115.38,
      otherDeductions: 25,
      grossSalary: 3250,
      netSalary: 3109.62,
      paymentStatus: 'PENDING',
      paymentDate: null,
    };
    const hiddenId = '99999999-aaaa-bbbb-cccc-ddddeeeeffff';

    const pdf = await service.payslip(payslip);
    const text = readablePdf(pdf);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('EMP-01');
    expect(text).not.toContain(hiddenId);
  });
});
