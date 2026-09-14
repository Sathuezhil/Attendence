import { BadRequestException } from '@nestjs/common';
import { InvoiceCalculationService } from './invoice-calculation.service';

describe('InvoiceCalculationService', () => {
  const service = new InvoiceCalculationService();

  it('rejects empty item lists', () => {
    expect(() => service.calculate({ items: [] })).toThrow(BadRequestException);
  });

  it('rejects negative amounts', () => {
    expect(() =>
      service.calculate({
        items: [{ description: 'A', quantity: 1, unitPrice: -5 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a discount larger than the line amount', () => {
    expect(() =>
      service.calculate({
        items: [{ description: 'A', quantity: 1, unitPrice: 10, discount: 20 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('calculates totals on the backend', () => {
    const result = service.calculate({
      items: [{ description: 'A', quantity: 2, unitPrice: 50, taxRate: 10 }],
    });

    expect(result.subtotal).toBe(100);
    expect(result.taxAmount).toBe(10);
    expect(result.totalAmount).toBe(110);
  });
});
