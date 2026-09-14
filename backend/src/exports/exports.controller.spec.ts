import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ExportsController } from './exports.controller';

describe('ExportsController security', () => {
  it('does not expose export routes without JWT', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, ExportsController),
    ).toBeUndefined();
  });
});
