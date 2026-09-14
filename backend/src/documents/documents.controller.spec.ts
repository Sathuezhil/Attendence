import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { DocumentsController } from './documents.controller';

describe('DocumentsController security', () => {
  it('does not expose document routes without JWT', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, DocumentsController),
    ).toBeUndefined();
  });
});
