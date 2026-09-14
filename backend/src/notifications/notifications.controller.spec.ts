import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController security', () => {
  it('does not expose notification routes without JWT', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, NotificationsController),
    ).toBeUndefined();
  });
});
