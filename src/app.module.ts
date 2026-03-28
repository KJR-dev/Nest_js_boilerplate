import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

@Module({
  imports: [
    SentryModule.forRoot(),
    // ...other modules
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // GlobalExceptionFilter extends SentryGlobalFilter, so Sentry
      // error capture + our custom JSON response shape are both applied.
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // ...other providers
  ],
})
export class AppModule {}

