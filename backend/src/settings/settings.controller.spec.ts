import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { SettingsController } from './settings.controller';

describe('SettingsController security', () => {
  it('requires JWT for settings', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SettingsController),
    ).toBeUndefined();
  });
});
