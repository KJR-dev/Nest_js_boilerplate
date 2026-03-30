import {
  Catch,
  HttpException,
  HttpStatus,
  ArgumentsHost,
  Optional,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ErrorLogService } from '../error-log/error-log.service';
import { RequestSnapshot } from '../error-log/error-log.schema';

// ── Redaction constants ─────────────────────────────────────────────────────
const REDACTED = '[REDACTED]';
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'set-cookie',
]);
const SENSITIVE_BODY_KEYS = new Set([
  'password',
  'passwordConfirm',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'creditCard',
  'cvv',
  'ssn',
]);

/**
 * GlobalExceptionFilter:
 *  1. Generates a UUID per error (errorId)
 *  2. Captures to Sentry with errorId tag + full request context
 *  3. Persists error + request snapshot to MongoDB (TTL: 15 days)
 *  4. Returns errorId in the HTTP response for client-side tracking / support
 *
 * Registered as APP_FILTER in AppModule (DI-aware).
 */
@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  constructor(
    @InjectPinoLogger(GlobalExceptionFilter.name)
    private readonly logger: PinoLogger,
    @Optional()
    private readonly errorLogService: ErrorLogService,
  ) {
    super();
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
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

    // ── 1. Generate UUID for this error ────────────────────────────────────
    const errorId = crypto.randomUUID();

    // ── 2. Build sanitized request snapshot ────────────────────────────────
    const requestSnapshot = this.buildRequestSnapshot(request);

    // ── 3. Send to Sentry with errorId tag + request context ───────────────
    let sentryEventId: string | null = null;
    if (!isHttp) {
      sentryEventId = Sentry.withScope((scope) => {
        scope.setTag('error_id', errorId);
        scope.setContext('request', requestSnapshot);
        return Sentry.captureException(exception);
      });
    }

    // ── 4. Persist to MongoDB (fire-and-forget) ─────────────────────────────
    if (this.errorLogService) {
      void this.errorLogService.create({
        errorId,
        sentryEventId,
        statusCode: status,
        method: request.method,
        path: request.url,
        message:
          exception instanceof Error ? exception.message : String(message),
        stack: exception instanceof Error ? (exception.stack ?? null) : null,
        errorName:
          exception instanceof Error ? exception.constructor.name : null,
        environment: process.env.NODE_ENV ?? 'development',
        request: requestSnapshot,
      });
    }

    // ── 5. Log via pino ─────────────────────────────────────────────────────
    this.logger.error(
      {
        errorId,
        sentryEventId,
        err: exception,
        method: request.method,
        url: request.url,
        status,
      },
      `${request.method} ${request.url} → ${status} [${errorId}]`,
    );

    // ── 6. Send a single, consistent error envelope with the errorId ────────
    response.status(status).json({
      statusCode: status,
      errorId,
      ...(sentryEventId && { sentryEventId }),
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Builds a sanitized snapshot of the request.
   * - Redacts sensitive headers (Authorization, Cookie, etc.)
   * - Redacts sensitive body fields (password, token, secret, etc.)
   * - Caps body size to avoid storing huge payloads in MongoDB
   */
  private buildRequestSnapshot(request: Request): RequestSnapshot {
    const raw = {
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(
        request.headers as Record<string, string | string[] | undefined>,
      ),
      // Spread into plain objects — Express uses Object.create(null) for query/params,
      // which Mongoose's Mixed type cannot serialize correctly (drops them silently).
      query: { ...request.query },
      params: { ...request.params },
      body: this.sanitizeBody(request.body as Record<string, unknown>),
      ip: request.ip ?? request.socket?.remoteAddress,
      userAgent: request.headers['user-agent'],
    };

    // JSON round-trip converts the whole object to a pure plain object,
    // ensuring Mongoose Mixed stores every field — including empty {} objects.
    return JSON.parse(JSON.stringify(raw)) as RequestSnapshot;
  }

  private sanitizeHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): Record<string, string | string[] | undefined> {
    const sanitized: Record<string, string | string[] | undefined> = {};
    for (const [key, value] of Object.entries(headers)) {
      sanitized[key] = SENSITIVE_HEADERS.has(key.toLowerCase())
        ? REDACTED
        : value;
    }
    return sanitized;
  }

  private sanitizeBody(
    body: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null {
    if (!body || typeof body !== 'object') return null;

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      sanitized[key] = SENSITIVE_BODY_KEYS.has(key) ? REDACTED : value;
    }

    // Truncate to avoid storing huge payloads (> 10 KB) in MongoDB
    const json = JSON.stringify(sanitized);
    if (json.length > 10_000) {
      return { _truncated: true, _originalSize: json.length };
    }

    return sanitized;
  }
}
