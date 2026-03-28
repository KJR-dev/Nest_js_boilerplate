import * as common from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryExceptionCaptured } from '@sentry/nestjs';

@common.Catch() // 👈 catch ALL exceptions
export class GlobalExceptionFilter implements common.ExceptionFilter {
  @SentryExceptionCaptured() // 👈 sends error to Sentry automatically
  catch(exception: unknown, host: common.ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof common.HttpException
        ? exception.getStatus()
        : common.HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof common.HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Optional: log
    console.error('Global Error:', exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
