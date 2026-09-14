import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { AppConfiguration } from '../config/configuration';
import { InvoiceResponse } from '../invoices/invoices.types';
import { SettingsService } from '../settings/settings.service';
import { formatMoney, periodLabel, present } from './export-format';
import { PayslipData, ReportExportDocument } from './export.types';

type PdfDoc = PDFKit.PDFDocument;

const PAGE = { size: 'A4' as const, margin: 48 };
const TEXT = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const HEADER_FILL = '#111827';

function pdfConstructor(): new (options?: PDFKit.PDFDocumentOptions) => PdfDoc {
  const imported = PDFDocument as unknown as {
    default?: new (options?: PDFKit.PDFDocumentOptions) => PdfDoc;
  };
  return imported.default ?? PDFDocument;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly config: ConfigService<AppConfiguration, true>,
    private readonly settings?: SettingsService,
  ) {}

  async report(document: ReportExportDocument): Promise<Buffer> {
    await this.resolveCompany();
    return this.render((doc) => this.drawReport(doc, document));
  }

  async invoice(invoice: InvoiceResponse): Promise<Buffer> {
    await this.resolveCompany();
    return this.render((doc) => this.drawInvoice(doc, invoice));
  }

  async payslip(payslip: PayslipData): Promise<Buffer> {
    await this.resolveCompany();
    return this.render((doc) => this.drawPayslip(doc, payslip));
  }

  private cachedCompany: {
    name: string;
    email: string;
    phone: string;
    address: string;
  } | null = null;

  private envCompany() {
    const company = this.config.get('company', { infer: true });
    return {
      name: company.name?.trim() || 'Company',
      email: company.email?.trim() || '',
      phone: company.phone?.trim() || '',
      address: company.address?.trim() || '',
    };
  }

  private async resolveCompany(): Promise<void> {
    if (this.settings) {
      try {
        const profile = (await this.settings.get()).company;
        const fallback = this.envCompany();
        this.cachedCompany = {
          name: profile.name.trim() || fallback.name,
          email: profile.email.trim() || fallback.email,
          phone: profile.phone.trim() || fallback.phone,
          address: profile.address.trim() || fallback.address,
        };
        return;
      } catch {
        // Use environment company details when settings are unavailable.
      }
    }
    this.cachedCompany = this.envCompany();
  }

  private company() {
    return this.cachedCompany ?? this.envCompany();
  }

  private async render(draw: (doc: PdfDoc) => void): Promise<Buffer> {
    try {
      const Ctor = pdfConstructor();
      const doc = new Ctor({
        size: PAGE.size,
        margin: PAGE.margin,
        bufferPages: true,
        info: { Author: this.company().name },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      const done = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      });
      draw(doc);
      this.drawPageNumbers(doc);
      doc.end();
      return await done;
    } catch {
      this.logger.error('PDF generation failed');
      throw new InternalServerErrorException('Unable to generate PDF');
    }
  }

  private drawReport(doc: PdfDoc, document: ReportExportDocument): void {
    this.drawBrandedHeader(doc, document.title, document.generatedAt);
    this.sectionTitle(doc, 'Filters');
    if (document.filters.length === 0) {
      doc.fillColor(MUTED).fontSize(10).text('None');
    } else {
      for (const filter of document.filters) {
        doc
          .fillColor(TEXT)
          .fontSize(10)
          .text(`${filter.label}: ${filter.value}`);
      }
    }
    doc.moveDown(0.8);
    this.sectionTitle(doc, 'Summary');
    this.drawMetrics(doc, document.summary);
    if (document.table.truncated) {
      doc
        .fillColor(MUTED)
        .fontSize(9)
        .text(
          `Showing first ${document.table.includedRows} of ${document.table.totalMatches} matching records.`,
        );
      doc.moveDown(0.4);
    }
    this.sectionTitle(doc, 'Report data');
    this.drawTable(doc, document);
  }

  private drawInvoice(doc: PdfDoc, invoice: InvoiceResponse): void {
    const company = invoice.company ?? this.company();
    const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    this.drawBrandedHeader(doc, 'Invoice', generatedAt, [
      company.name || this.company().name,
      company.email,
      company.phone,
      company.address,
    ]);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const col = (right - left) / 2;

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(TEXT)
      .text('Bill to', left, doc.y);
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(invoice.customerName, left, doc.y, { width: col - 12 });
    if (invoice.customerEmail) {
      doc.text(invoice.customerEmail, { width: col - 12 });
    }
    if (invoice.customerPhone) {
      doc.text(invoice.customerPhone, { width: col - 12 });
    }
    if (invoice.customerAddress) {
      doc.text(invoice.customerAddress, { width: col - 12 });
    }

    const metaY = doc.y - 56;
    const metaLeft = left + col;
    doc
      .font('Helvetica-Bold')
      .text('Invoice number', metaLeft, Math.max(metaY, 130));
    doc.font('Helvetica').text(invoice.invoiceNumber, metaLeft);
    doc.font('Helvetica-Bold').text('Invoice date');
    doc.font('Helvetica').text(invoice.invoiceDate);
    doc.font('Helvetica-Bold').text('Due date');
    doc.font('Helvetica').text(invoice.dueDate);
    doc.font('Helvetica-Bold').text('Payment status');
    doc.font('Helvetica').text(invoice.status.replaceAll('_', ' '));

    doc.moveDown(1.5);
    this.sectionTitle(doc, 'Items');
    const itemDoc: ReportExportDocument = {
      title: 'Invoice items',
      fileStem: invoice.invoiceNumber,
      generatedAt,
      filters: [],
      summary: [],
      table: {
        columns: [
          { key: 'description', header: 'Description', width: 180 },
          { key: 'quantity', header: 'Qty', width: 50 },
          { key: 'unitPrice', header: 'Unit price', width: 70 },
          { key: 'tax', header: 'Tax %', width: 50 },
          { key: 'discount', header: 'Discount', width: 60 },
          { key: 'lineTotal', header: 'Line total', width: 70 },
        ],
        rows: invoice.items.map((item) => ({
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: formatMoney(item.unitPrice),
          tax: formatMoney(item.taxRate),
          discount: formatMoney(item.discount),
          lineTotal: formatMoney(item.lineTotal),
        })),
        truncated: false,
        totalMatches: invoice.items.length,
        includedRows: invoice.items.length,
      },
    };
    this.drawTable(doc, itemDoc);

    doc.moveDown(0.6);
    this.drawMetrics(doc, [
      { label: 'Subtotal', value: formatMoney(invoice.subtotal) },
      { label: 'Discount', value: formatMoney(invoice.discountAmount) },
      { label: 'Tax', value: formatMoney(invoice.taxAmount) },
      { label: 'Grand total', value: formatMoney(invoice.totalAmount) },
    ]);

    if (invoice.notes?.trim()) {
      this.sectionTitle(doc, 'Notes');
      doc.font('Helvetica').fontSize(10).fillColor(TEXT).text(invoice.notes);
    }
  }

  private drawPayslip(doc: PdfDoc, payslip: PayslipData): void {
    this.drawBrandedHeader(
      doc,
      'Payslip',
      new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    );
    this.sectionTitle(doc, 'Employee');
    this.drawMetrics(doc, [
      { label: 'Name', value: payslip.fullName },
      { label: 'Employee code', value: payslip.employeeCode },
      { label: 'Job title', value: present(payslip.jobTitle) },
      {
        label: 'Salary period',
        value: periodLabel(payslip.payrollMonth, payslip.payrollYear),
      },
    ]);

    this.sectionTitle(doc, 'Earnings');
    this.drawMetrics(doc, [
      { label: 'Basic salary', value: formatMoney(payslip.basicSalary) },
      { label: 'Allowances', value: formatMoney(payslip.allowances) },
      { label: 'Overtime', value: formatMoney(payslip.overtimeAmount) },
    ]);

    this.sectionTitle(doc, 'Deductions');
    this.drawMetrics(doc, [
      {
        label: 'Unpaid leave',
        value: `${payslip.unpaidLeaveDays} day(s) · ${formatMoney(payslip.unpaidLeaveDeduction)}`,
      },
      {
        label: 'Other deductions',
        value: formatMoney(payslip.otherDeductions),
      },
    ]);

    this.sectionTitle(doc, 'Totals');
    this.drawMetrics(doc, [
      { label: 'Gross salary', value: formatMoney(payslip.grossSalary) },
      { label: 'Net salary', value: formatMoney(payslip.netSalary) },
      {
        label: 'Payment status',
        value: payslip.paymentStatus.replaceAll('_', ' '),
      },
      { label: 'Payment date', value: present(payslip.paymentDate) },
    ]);
  }

  private drawBrandedHeader(
    doc: PdfDoc,
    title: string,
    generatedAt: string,
    extra: Array<string | null | undefined> = [],
  ): void {
    const company = this.company();
    doc.font('Helvetica-Bold').fontSize(16).fillColor(TEXT).text(company.name);
    for (const line of extra) {
      if (line) {
        doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(line);
      }
    }
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(18).fillColor(TEXT).text(title);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`Generated ${generatedAt}`);
    doc
      .moveTo(doc.page.margins.left, doc.y + 6)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 6)
      .strokeColor(LINE)
      .stroke();
    doc.moveDown(1.2);
  }

  private sectionTitle(doc: PdfDoc, title: string): void {
    this.ensureSpace(doc, 36);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(TEXT).text(title);
    doc.moveDown(0.3);
  }

  private drawMetrics(
    doc: PdfDoc,
    items: Array<{ label: string; value: string }>,
  ): void {
    const left = doc.page.margins.left;
    const width =
      (doc.page.width - doc.page.margins.left - doc.page.margins.right - 12) /
      2;
    let y = doc.y;
    items.forEach((item, index) => {
      const column = index % 2;
      if (column === 0 && index > 0) {
        y += 28;
      }
      this.ensureSpace(doc, 32);
      if (doc.y > y) {
        y = doc.y;
      }
      const x = left + column * (width + 12);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(item.label, x, y, {
          width,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(TEXT)
        .text(item.value, x, y + 11, {
          width,
        });
    });
    doc.y = y + 36;
    doc.x = left;
  }

  private drawTable(doc: PdfDoc, document: ReportExportDocument): void {
    const columns = document.table.columns;
    const inner =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const specified = columns.reduce(
      (sum, column) => sum + (column.width ?? 0),
      0,
    );
    const fallback = columns.filter((column) => !column.width).length;
    const remaining = Math.max(inner - specified, 40);
    const widths = columns.map(
      (column) => column.width ?? remaining / Math.max(fallback, 1),
    );

    const drawHeader = () => {
      this.ensureSpace(doc, 24);
      let x = doc.page.margins.left;
      const y = doc.y;
      doc.rect(x, y, inner, 20).fill(HEADER_FILL);
      columns.forEach((column, index) => {
        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(column.header, x + 4, y + 6, {
            width: widths[index] - 8,
            ellipsis: true,
          });
        x += widths[index];
      });
      doc.y = y + 22;
    };

    drawHeader();

    if (document.table.rows.length === 0) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor(MUTED)
        .text('No records match the selected filters.');
      return;
    }

    for (const [rowIndex, row] of document.table.rows.entries()) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 36) {
        doc.addPage();
        drawHeader();
      }
      let x = doc.page.margins.left;
      const y = doc.y;
      if (rowIndex % 2 === 0) {
        doc.rect(x, y, inner, 18).fill('#f9fafb');
      }
      columns.forEach((column, index) => {
        doc
          .fillColor(TEXT)
          .font('Helvetica')
          .fontSize(8)
          .text(row[column.key] ?? '', x + 4, y + 4, {
            width: widths[index] - 8,
            ellipsis: true,
            lineBreak: false,
          });
        x += widths[index];
      });
      doc.y = y + 18;
    }
  }

  private drawPageNumbers(doc: PdfDoc): void {
    const range = doc.bufferedPageRange();
    const width =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left, 18, {
          width,
          align: 'right',
          lineBreak: false,
        });
    }
  }

  private ensureSpace(doc: PdfDoc, needed: number): void {
    if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
  }
}
