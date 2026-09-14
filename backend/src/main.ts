import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { assertProductionConfig } from './config/assert-production';
import { AppConfiguration } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService<AppConfiguration, true>);

  const nodeEnv = configService.get('nodeEnv', { infer: true });
  const corsOrigins = configService.get('corsOrigins', { infer: true });
  assertProductionConfig({
    nodeEnv,
    corsOrigins,
    firestore: configService.get('firestore', { infer: true }),
    jwt: configService.get('jwt', { infer: true }),
    storage: configService.get('storage', { infer: true }),
  });
  const allowAnyOrigin = nodeEnv !== 'production' && corsOrigins.includes('*');

  app.disable('x-powered-by');
  app.use(
    (
      _req: { method?: string },
      res: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      next();
    },
  );

  app.enableCors({
    origin: allowAnyOrigin ? true : corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
