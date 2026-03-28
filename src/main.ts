// instrument.ts MUST be the very first import — it initializes Sentry and loads dotenv
import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server is running on port: ${port}`);
}
bootstrap();
