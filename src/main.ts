// instrument.ts MUST be the very first import — it initializes Sentry and loads dotenv
import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Buffer logs during bootstrap so they flow through pino (not the default logger)
    bufferLogs: true,
  });

  // Replace NestJS's default logger with pino for all app-level logs
  app.useLogger(app.get(Logger));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();

