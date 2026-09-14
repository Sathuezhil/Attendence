import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { LocalObjectStorage } from './local-object-storage';
import { OBJECT_STORAGE } from './storage.tokens';

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfiguration, true>) => {
        const localDir = config.get('storage', { infer: true }).localDir;
        return new LocalObjectStorage(localDir);
      },
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
