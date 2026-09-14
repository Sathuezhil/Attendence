import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ReportsController } from './reports.controller';

describe('ReportsController security', () => {
  it('does not expose report routes without JWT', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, ReportsController),
    ).toBeUndefined();
  });
});
