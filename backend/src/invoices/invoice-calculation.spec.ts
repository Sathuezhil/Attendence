import { calculateInvoice } from './invoice-calculation';

describe('invoice calculation', () => {
  it('multiplies quantity by unit price', () => {
    const result = calculateInvoice({
      items: [
        {
          description: 'Labour',
          quantity: 3,
          unitPrice: 100,
        },
      ],
    });

    expect(result.subtotal).toBe(300);
    expect(result.items[0].lineTotal).toBe(300);
    expect(result.totalAmount).toBe(300);
  });

  it('applies item discounts before tax', () => {
    const result = calculateInvoice({
      items: [
        {
          description: 'Service',
          quantity: 2,
          unitPrice: 50,
          discount: 10,
          taxRate: 10,
        },
      ],
    });

    expect(result.subtotal).toBe(100);
    expect(result.discountAmount).toBe(10);
    expect(result.taxAmount).toBe(9);
    expect(result.items[0].lineTotal).toBe(99);
    expect(result.totalAmount).toBe(99);
  });

  it('sums tax from multiple items and invoice-level tax', () => {
    const result = calculateInvoice({
      items: [
        { description: 'A', quantity: 1, unitPrice: 100, taxRate: 5 },
        { description: 'B', quantity: 1, unitPrice: 40, taxRate: 5 },
      ],
      taxAmount: 2,
    });

    expect(result.subtotal).toBe(140);
    expect(result.itemTaxTotal).toBe(7);
    expect(result.taxAmount).toBe(9);
    expect(result.totalAmount).toBe(149);
  });

  it('uses integer cents to avoid floating-point errors', () => {
    const result = calculateInvoice({
      items: [
        { description: 'Parts', quantity: 3, unitPrice: 0.1 },
        { description: 'Fee', quantity: 1, unitPrice: 0.2 },
      ],
    });

    expect(result.subtotal).toBe(0.5);
    expect(result.totalAmount).toBe(0.5);
  });

  it('calculates a grand total after invoice discount', () => {
    const result = calculateInvoice({
      items: [{ description: 'A', quantity: 1, unitPrice: 200, taxRate: 5 }],
      discountAmount: 20,
    });

    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(10);
    expect(result.discountAmount).toBe(20);
    expect(result.totalAmount).toBe(190);
  });
});
