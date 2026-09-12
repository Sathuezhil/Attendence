import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfiguration } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfiguration, true>);

  const nodeEnv = configService.get('nodeEnv', { infer: true });
  const corsOrigins = configService.get('corsOrigins', { infer: true });
  const allowAnyOrigin = nodeEnv === 'development' || corsOrigins.includes('*');

  app.enableCors({
    origin: allowAnyOrigin ? true : corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
