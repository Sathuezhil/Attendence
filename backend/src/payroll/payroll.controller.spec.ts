import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { PayrollController } from './payroll.controller';

describe('PayrollController security', () => {
  it('does not expose payroll routes without JWT', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, PayrollController),
    ).toBeUndefined();
  });
});
