import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  ArgumentsHost,
} from '@nestjs/common';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { Request, Response } from 'express';

/**
 * GlobalExceptionFilter extends SentryGlobalFilter so that:
 *  1. super.catch() sends the raw exception to Sentry automatically
 *  2. We then craft a consistent JSON error response for the client
 *
 * Registered as APP_FILTER in AppModule (DI-aware, works with Sentry's SentryModule).
 */
@Catch()
export class GlobalExceptionFilter extends SentryGlobalFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost) {
    // 1. Let SentryGlobalFilter capture & report to Sentry first
    super.catch(exception, host);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;

    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttp
      ? (exception.getResponse() as string | object)
      : 'Internal server error';

    // 2. Log to NestJS logger (also appears in Sentry via consoleLoggingIntegration)
    this.logger.error(
      `[${request.method}] ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // 3. Return a consistent error envelope to the client
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
