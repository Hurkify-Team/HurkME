import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initSentry } from './sentry/sentry';

const isBootDebugEnabled = process.env.BOOT_DEBUG === 'true';

function bootDebug(message: string): void {
  if (isBootDebugEnabled) {
    console.log(`[boot] ${message}`);
  }
}

async function bootstrap() {
  bootDebug('init-sentry');
  initSentry();

  bootDebug('create-app:start');
  const app = await NestFactory.create(AppModule, { cors: false });
  bootDebug('create-app:done');

  app.enableCors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HurkME API')
    .setDescription('MVP API for Daily Steps, discovery, and Paid Jobs')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 4000);
  bootDebug(`listen:start:${port}`);
  await app.listen(port);
  bootDebug('listen:done');
  console.log(`HurkME API running on http://localhost:${port}`);
}

void bootstrap();
