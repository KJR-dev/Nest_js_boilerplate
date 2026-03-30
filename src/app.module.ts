import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggerModule } from './common/logger/logger.module';
import { ErrorLogModule } from './common/error-log/error-log.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    LoggerModule,
    MongooseModule.forRoot(process.env.MONGODB_URL as string, {
      // Automatically sync TTL indexes defined in schemas
      autoIndex: true,
    }),
    ErrorLogModule,
    // ...other modules
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // GlobalExceptionFilter: UUID per error → Sentry tag → MongoDB (TTL 15d)
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // ...other providers
  ],
})
export class AppModule {}
