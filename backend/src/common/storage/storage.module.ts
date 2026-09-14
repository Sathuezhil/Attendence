import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { createObjectStorage } from './create-object-storage';
import { OBJECT_STORAGE } from './storage.tokens';

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfiguration, true>) => {
        return createObjectStorage(
          config.get('storage', { infer: true }),
          new Logger('StorageModule'),
        );
      },
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
