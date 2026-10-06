import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';

import { AppModule } from './app.module';
import { configureDNS } from './config/dns.config';

async function bootstrap() {
  if (process.env.MONGODB_DNS_SERVERS) {
    configureDNS();
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableCors({
    origin: config.getOrThrow<string[]>('corsOrigins'),
    credentials: true,
  });

  // Serve locally stored images when UPLOAD_DRIVER=local.
  app.useStaticAssets(join(process.cwd(), config.getOrThrow<string>('uploads.dir')), {
    prefix: '/uploads/',
  });

  if (config.get<string>('env') !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Amuthinai API')
        .setDescription('Surplus-food redistribution platform')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );

    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.getOrThrow<number>('port');
  await app.listen(port);
  logger.log(`API ready on http://localhost:${port}/api/v1`);
}

void bootstrap();
