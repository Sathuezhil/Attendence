import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { SearchController } from './search.controller';

describe('SearchController security', () => {
  it('does not expose search without JWT', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SearchController),
    ).toBeUndefined();
  });
});
