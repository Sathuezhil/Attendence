import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice, InvoiceItem, InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { toDateOnly } from '../attendance/working-hours';
import { parseOptionalDate } from '../common/utils/parse-date';
import { AppConfiguration } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceCalculationService } from './invoice-calculation.service';
import {
  canCancelInvoice,
  canEditInvoice,
  canMarkInvoicePaid,
  canSendInvoice,
  OPEN_INVOICE_STATUSES,
  resolveInvoiceStatus,
  statusAfterSend,
  todayUtcDate,
} from './invoice-status';
import { toInvoiceResponse } from './invoices.mapper';
import {
  InvoiceCompanyInfo,
  InvoicePreview,
  InvoiceResponse,
  PaginatedInvoices,
} from './invoices.types';
import { toMoney } from './invoice-money';

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: InvoiceCalculationService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  preview(dto: CreateInvoiceDto): InvoicePreview {
    const totals = this.calculation.calculate({
      items: dto.items,
      taxAmount: dto.taxAmount,
      discountAmount: dto.discountAmount,
    });

    return {
      items: totals.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: item.discount,
        lineSubtotal: item.lineSubtotal,
        lineTax: item.lineTax,
        lineTotal: item.lineTotal,
      })),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
    };
  }

  async create(dto: CreateInvoiceDto): Promise<InvoiceResponse> {
    const dates = this.parseInvoiceDates(dto.invoiceDate, dto.dueDate);
    const totals = this.calculation.calculate({
      items: dto.items,
      taxAmount: dto.taxAmount,
      discountAmount: dto.discountAmount,
    });

    const invoice = await this.createWithUniqueNumber({
      customerName: dto.customerName.trim(),
      customerEmail: dto.customerEmail ?? null,
      customerPhone: dto.customerPhone ?? null,
      customerAddress: dto.customerAddress ?? null,
      invoiceDate: dates.invoiceDate,
      dueDate: dates.dueDate,
      status: InvoiceStatus.DRAFT,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalAmount: totals.totalAmount,
      notes: dto.notes ?? null,
      items: {
        create: totals.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          lineTotal: item.lineTotal,
        })),
      },
    });

    return this.toResponse(invoice);
  }

  async findAll(query: QueryInvoicesDto): Promise<PaginatedInvoices> {
    await this.markOverdueInvoices();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [total, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: { items: { orderBy: { createdAt: 'asc' } } },
        orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: invoices.map((invoice) => this.toResponse(invoice)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findOne(id: string): Promise<InvoiceResponse> {
    const invoice = await this.persistResolvedStatus(
      await this.findOrThrow(id),
    );
    return this.toResponse(invoice);
  }

  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceResponse> {
    const current = await this.persistResolvedStatus(
      await this.findOrThrow(id),
    );
    if (!canEditInvoice(current.status)) {
      throw new BadRequestException('This invoice cannot be edited');
    }

    const invoiceDate =
      parseOptionalDate(dto.invoiceDate, 'invoiceDate') ?? current.invoiceDate;
    const dueDate =
      parseOptionalDate(dto.dueDate, 'dueDate') ?? current.dueDate;
    this.assertDateOrder(invoiceDate, dueDate);

    const items =
      dto.items ??
      current.items.map((item) => ({
        description: item.description,
        quantity: toMoney(item.quantity),
        unitPrice: toMoney(item.unitPrice),
        taxRate: toMoney(item.taxRate),
        discount: toMoney(item.discount),
      }));

    const extras = this.currentInvoiceExtras(current);
    const extraTax = dto.taxAmount ?? extras.taxAmount;
    const extraDiscount = dto.discountAmount ?? extras.discountAmount;
    const totals = this.calculation.calculate({
      items,
      taxAmount: extraTax,
      discountAmount: extraDiscount,
    });
    const status = resolveInvoiceStatus(current.status, dueDate);

    const invoice = await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: current.id } });
      return tx.invoice.update({
        where: { id: current.id },
        data: {
          customerName: dto.customerName?.trim() ?? current.customerName,
          customerEmail:
            dto.customerEmail === undefined
              ? current.customerEmail
              : dto.customerEmail,
          customerPhone:
            dto.customerPhone === undefined
              ? current.customerPhone
              : dto.customerPhone,
          customerAddress:
            dto.customerAddress === undefined
              ? current.customerAddress
              : dto.customerAddress,
          invoiceDate,
          dueDate,
          status,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          notes: dto.notes === undefined ? current.notes : dto.notes,
          items: {
            create: totals.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              discount: item.discount,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
    });

    return this.toResponse(invoice);
  }

  async send(id: string): Promise<InvoiceResponse> {
    const current = await this.findOrThrow(id);
    if (!canSendInvoice(current.status)) {
      throw new BadRequestException('Only draft invoices can be sent');
    }

    const invoice = await this.prisma.invoice.update({
      where: { id: current.id },
      data: { status: statusAfterSend(current.dueDate) },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    return this.toResponse(invoice);
  }

  async markPaid(id: string): Promise<InvoiceResponse> {
    const current = await this.findOrThrow(id);
    if (!canMarkInvoicePaid(current.status)) {
      throw new BadRequestException('Cancelled invoices cannot be marked paid');
    }
    if (current.status === InvoiceStatus.PAID) {
      return this.toResponse(current);
    }

    const invoice = await this.prisma.invoice.update({
      where: { id: current.id },
      data: { status: InvoiceStatus.PAID },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    return this.toResponse(invoice);
  }

  async cancel(id: string): Promise<InvoiceResponse> {
    const current = await this.findOrThrow(id);
    if (current.status === InvoiceStatus.CANCELLED) {
      return this.toResponse(current);
    }
    if (!canCancelInvoice(current.status)) {
      throw new BadRequestException('Paid invoices cannot be cancelled');
    }

    const invoice = await this.prisma.invoice.update({
      where: { id: current.id },
      data: { status: InvoiceStatus.CANCELLED },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    return this.toResponse(invoice);
  }

  async markOverdueInvoices(): Promise<number> {
    const result = await this.prisma.invoice.updateMany({
      where: {
        status: {
          in: OPEN_INVOICE_STATUSES.filter(
            (status) => status !== InvoiceStatus.OVERDUE,
          ),
        },
        dueDate: { lt: todayUtcDate() },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    return result.count;
  }

  private currentInvoiceExtras(invoice: InvoiceWithItems): {
    taxAmount: number;
    discountAmount: number;
  } {
    const itemTotals = this.calculation.calculate({
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: toMoney(item.quantity),
        unitPrice: toMoney(item.unitPrice),
        taxRate: toMoney(item.taxRate),
        discount: toMoney(item.discount),
      })),
    });

    return {
      taxAmount: Math.max(
        0,
        Math.round(
          (toMoney(invoice.taxAmount) - itemTotals.itemTaxTotal) * 100,
        ) / 100,
      ),
      discountAmount: Math.max(
        0,
        Math.round(
          (toMoney(invoice.discountAmount) - itemTotals.itemDiscountTotal) *
            100,
        ) / 100,
      ),
    };
  }

  private buildWhere(query: QueryInvoicesDto): Prisma.InvoiceWhereInput {
    const fromDate = parseOptionalDate(query.fromDate, 'fromDate');
    const toDate = parseOptionalDate(query.toDate, 'toDate');
    const search = query.search?.trim();
    const customer = query.customer?.trim();

    return {
      status: query.status,
      invoiceDate: {
        gte: fromDate ?? undefined,
        lte: toDate ?? undefined,
      },
      AND: [
        customer
          ? {
              OR: [
                {
                  customerName: { contains: customer, mode: 'insensitive' },
                },
                {
                  customerEmail: { contains: customer, mode: 'insensitive' },
                },
              ],
            }
          : {},
        search
          ? {
              OR: [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerEmail: { contains: search, mode: 'insensitive' } },
                { customerPhone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
  }

  private async createWithUniqueNumber(
    data: Omit<Prisma.InvoiceCreateInput, 'invoiceNumber'>,
  ): Promise<InvoiceWithItems> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.invoice.create({
          data: {
            ...data,
            invoiceNumber: await this.nextInvoiceNumber(),
          },
          include: { items: { orderBy: { createdAt: 'asc' } } },
        });
      } catch (error) {
        if (
          error instanceof PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 4
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new BadRequestException('Unable to allocate a unique invoice number');
  }

  private async nextInvoiceNumber(): Promise<string> {
    const year = todayUtcDate().getUTCFullYear();
    const prefix = `${this.config.get('invoiceNumberPrefix', { infer: true }) || 'INV'}-${year}-`;
    const latest = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    const current = latest
      ? Number(latest.invoiceNumber.slice(prefix.length))
      : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  private parseInvoiceDates(invoiceDateValue: string, dueDateValue: string) {
    const invoiceDate = parseOptionalDate(invoiceDateValue, 'invoiceDate');
    const dueDate = parseOptionalDate(dueDateValue, 'dueDate');
    if (!invoiceDate || !dueDate) {
      throw new BadRequestException('invoiceDate and dueDate are required');
    }

    this.assertDateOrder(invoiceDate, dueDate);
    return { invoiceDate, dueDate };
  }

  private assertDateOrder(invoiceDate: Date, dueDate: Date): void {
    if (toDateOnly(dueDate) < toDateOnly(invoiceDate)) {
      throw new BadRequestException('dueDate cannot be before invoiceDate');
    }
  }

  private async persistResolvedStatus(
    invoice: InvoiceWithItems,
  ): Promise<InvoiceWithItems> {
    const status = resolveInvoiceStatus(invoice.status, invoice.dueDate);
    if (status === invoice.status) {
      return invoice;
    }

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

  private async findOrThrow(id: string): Promise<InvoiceWithItems> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  private toResponse(invoice: InvoiceWithItems): InvoiceResponse {
    return toInvoiceResponse(invoice, this.companyInfo());
  }

  private companyInfo(): InvoiceCompanyInfo | null {
    const company = this.config.get('company', { infer: true });
    const name = company.name?.trim() || null;
    const email = company.email?.trim() || null;
    const phone = company.phone?.trim() || null;
    const address = company.address?.trim() || null;

    if (!name && !email && !phone && !address) {
      return null;
    }

    return { name, email, phone, address };
  }
}
