import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { OPEN_INVOICE_STATUSES } from '../invoices/invoice-status';
import { InvoicesService } from '../invoices/invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryInvoiceReportDto } from './dto/query-invoice-report.dto';
import { roundMoney } from './report-math';
import { resolveReportPeriod } from './report-period';
import { InvoiceReportResponse } from './reports.types';

const PENDING_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.DRAFT,
  InvoiceStatus.SENT,
  InvoiceStatus.PARTIALLY_PAID,
];

@Injectable()
export class InvoiceReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async getReport(
    query: QueryInvoiceReportDto,
  ): Promise<InvoiceReportResponse> {
    await this.invoicesService.markOverdueInvoices();
    const { start, end, period } = resolveReportPeriod(
      query.startDate,
      query.endDate,
    );
    const where = this.where(query, start, end);

    const [statusRows, invoiced, paid, outstanding] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          ...where,
          status: query.status ?? { not: InvoiceStatus.CANCELLED },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: InvoiceStatus.PAID },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          ...where,
          status: query.status ? query.status : { in: OPEN_INVOICE_STATUSES },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const byStatus = Object.fromEntries(
      statusRows.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<InvoiceStatus, number>>;

    const pending = PENDING_STATUSES.reduce(
      (sum, status) => sum + (byStatus[status] ?? 0),
      0,
    );

    return {
      period,
      total: statusRows.reduce((sum, row) => sum + row._count._all, 0),
      paid: byStatus.PAID ?? 0,
      pending,
      overdue: byStatus.OVERDUE ?? 0,
      cancelled: byStatus.CANCELLED ?? 0,
      totalInvoicedAmount: roundMoney(invoiced._sum.totalAmount ?? 0),
      totalPaidAmount: roundMoney(paid._sum.totalAmount ?? 0),
      outstandingAmount:
        query.status && !OPEN_INVOICE_STATUSES.includes(query.status)
          ? 0
          : roundMoney(outstanding._sum.totalAmount ?? 0),
    };
  }

  where(
    query: QueryInvoiceReportDto,
    start: Date,
    end: Date,
  ): Prisma.InvoiceWhereInput {
    return {
      invoiceDate: { gte: start, lte: end },
      status: query.status,
    };
  }
}
