import { fromCents, toCents } from './invoice-money';

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

export interface InvoiceTotalsInput {
  items: InvoiceItemInput[];
  taxAmount?: number;
  discountAmount?: number;
}

export interface CalculatedInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export interface InvoiceCalculation {
  items: CalculatedInvoiceItem[];
  subtotal: number;
  itemDiscountTotal: number;
  itemTaxTotal: number;
  invoiceTaxAmount: number;
  invoiceDiscountAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
}

export function calculateInvoice(
  input: InvoiceTotalsInput,
): InvoiceCalculation {
  if (!input.items.length) {
    throw new Error('An invoice requires at least one item');
  }

  const invoiceTaxCents = toCents(input.taxAmount ?? 0);
  const invoiceDiscountCents = toCents(input.discountAmount ?? 0);
  const items: CalculatedInvoiceItem[] = [];
  let subtotalCents = 0;
  let itemDiscountCents = 0;
  let itemTaxCents = 0;

  for (const item of input.items) {
    const quantity = item.quantity;
    const unitPriceCents = toCents(item.unitPrice);
    const discountCents = toCents(item.discount ?? 0);
    const taxRate = item.taxRate ?? 0;
    const lineSubtotalCents = Math.round(quantity * unitPriceCents);
    const lineTaxableCents = lineSubtotalCents - discountCents;
    const lineTaxCents = Math.round((lineTaxableCents * taxRate) / 100);
    const lineTotalCents = lineTaxableCents + lineTaxCents;

    items.push({
      description: item.description.trim(),
      quantity,
      unitPrice: fromCents(unitPriceCents),
      taxRate,
      discount: fromCents(discountCents),
      lineSubtotal: fromCents(lineSubtotalCents),
      lineTax: fromCents(lineTaxCents),
      lineTotal: fromCents(lineTotalCents),
    });

    subtotalCents += lineSubtotalCents;
    itemDiscountCents += discountCents;
    itemTaxCents += lineTaxCents;
  }

  const discountAmountCents = itemDiscountCents + invoiceDiscountCents;
  const taxAmountCents = itemTaxCents + invoiceTaxCents;
  const totalAmountCents = subtotalCents - discountAmountCents + taxAmountCents;

  return {
    items,
    subtotal: fromCents(subtotalCents),
    itemDiscountTotal: fromCents(itemDiscountCents),
    itemTaxTotal: fromCents(itemTaxCents),
    invoiceTaxAmount: fromCents(invoiceTaxCents),
    invoiceDiscountAmount: fromCents(invoiceDiscountCents),
    taxAmount: fromCents(taxAmountCents),
    discountAmount: fromCents(discountAmountCents),
    totalAmount: fromCents(totalAmountCents),
  };
}
