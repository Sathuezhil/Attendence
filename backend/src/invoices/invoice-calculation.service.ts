import { BadRequestException, Injectable } from '@nestjs/common';
import {
  calculateInvoice,
  InvoiceCalculation,
  InvoiceItemInput,
} from './invoice-calculation';

export interface InvoiceAmountInput {
  items: InvoiceItemInput[];
  taxAmount?: number;
  discountAmount?: number;
}

@Injectable()
export class InvoiceCalculationService {
  calculate(input: InvoiceAmountInput): InvoiceCalculation {
    this.assertAmounts(input);

    try {
      const result = calculateInvoice(input);
      if (result.totalAmount < 0) {
        throw new BadRequestException(
          'Invoice discount cannot exceed the taxable amount',
        );
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid invoice amounts',
      );
    }
  }

  private assertAmounts(input: InvoiceAmountInput): void {
    if (!input.items?.length) {
      throw new BadRequestException('At least one invoice item is required');
    }

    const invoiceFields: Array<[string, number | undefined]> = [
      ['taxAmount', input.taxAmount],
      ['discountAmount', input.discountAmount],
    ];

    for (const [field, value] of invoiceFields) {
      if (value !== undefined && value < 0) {
        throw new BadRequestException(`${field} cannot be negative`);
      }
    }

    input.items.forEach((item, index) => {
      if (!item.description?.trim()) {
        throw new BadRequestException(`items.${index}.description is required`);
      }
      if (!(item.quantity > 0)) {
        throw new BadRequestException(
          `items.${index}.quantity must be greater than 0`,
        );
      }
      if (item.unitPrice < 0) {
        throw new BadRequestException(
          `items.${index}.unitPrice cannot be negative`,
        );
      }
      if ((item.taxRate ?? 0) < 0) {
        throw new BadRequestException(
          `items.${index}.taxRate cannot be negative`,
        );
      }
      if ((item.discount ?? 0) < 0) {
        throw new BadRequestException(
          `items.${index}.discount cannot be negative`,
        );
      }

      const lineSubtotal =
        Math.round(item.quantity * item.unitPrice * 100) / 100;
      if ((item.discount ?? 0) > lineSubtotal) {
        throw new BadRequestException(
          `items.${index}.discount cannot exceed the line amount`,
        );
      }
    });
  }
}
