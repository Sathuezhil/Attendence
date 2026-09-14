import { InvoiceItemWrite, InvoicePreview } from './types';

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export function previewInvoiceLocally(items: InvoiceItemWrite[]): InvoicePreview {
  let subtotalCents = 0;
  let discountCents = 0;
  let taxCents = 0;

  const calculated = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const lineSubtotalCents = Math.round(quantity * toCents(unitPrice));
    const lineDiscountCents = toCents(discount);
    const lineTaxCents = Math.round(((lineSubtotalCents - lineDiscountCents) * taxRate) / 100);
    const lineTotalCents = lineSubtotalCents - lineDiscountCents + lineTaxCents;

    subtotalCents += lineSubtotalCents;
    discountCents += lineDiscountCents;
    taxCents += lineTaxCents;

    return {
      ...item,
      lineSubtotal: fromCents(lineSubtotalCents),
      lineTax: fromCents(lineTaxCents),
      lineTotal: fromCents(lineTotalCents),
    };
  });

  return {
    items: calculated,
    subtotal: fromCents(subtotalCents),
    taxAmount: fromCents(taxCents),
    discountAmount: fromCents(discountCents),
    totalAmount: fromCents(subtotalCents - discountCents + taxCents),
  };
}
