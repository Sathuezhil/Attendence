import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { InvoicesController } from './invoices.controller';

describe('InvoicesController security', () => {
  it('does not expose invoice routes without JWT', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, InvoicesController),
    ).toBeUndefined();
  });
});
