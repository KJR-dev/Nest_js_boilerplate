import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ErrorLogDocument = HydratedDocument<ErrorLog>;

const FIFTEEN_DAYS_IN_SECONDS = 15 * 24 * 60 * 60; // 1_296_000

/** Sanitized snapshot of the HTTP request that triggered the error. */
export interface RequestSnapshot {
  [key: string]: unknown; // required for Sentry Context compatibility
  method: string;
  url: string;
  /** Headers with sensitive values redacted. */
  headers: Record<string, string | string[] | undefined>;
  /** Query-string params (?foo=bar). */
  query: Record<string, unknown>;
  /** Route params (:id, :slug, …). */
  params: Record<string, unknown>;
  /** Request body (sensitive fields redacted). */
  body: Record<string, unknown> | null;
  /** Client IP address. */
  ip: string | undefined;
  /** User-Agent header value. */
  userAgent: string | undefined;
}

@Schema({
  collection: 'error_logs',
  timestamps: true, // Adds createdAt & updatedAt automatically
})
export class ErrorLog {
  /** UUID shared between this MongoDB document and the Sentry event tag. */
  @Prop({ required: true, unique: true, index: true })
  errorId: string;

  /** The Sentry event ID returned by Sentry.captureException() (if captured). */
  @Prop({ type: String, default: null })
  sentryEventId: string | null;

  /** HTTP status code (500 for unhandled errors, 4xx for HttpExceptions). */
  @Prop({ required: true })
  statusCode: number;

  /** HTTP method of the incoming request (GET, POST, …). */
  @Prop({ required: true })
  method: string;

  /** Request URL path that triggered the error. */
  @Prop({ required: true })
  path: string;

  /** Error message string. */
  @Prop({ required: true })
  message: string;

  /** Full error stack trace (omitted for expected HttpExceptions). */
  @Prop({ type: String, default: null })
  stack: string | null;

  /** Error name / class (e.g. "TypeError", "NotFoundException"). */
  @Prop({ type: String, default: null })
  errorName: string | null;

  /** Application environment (development, production, test). */
  @Prop({ required: true })
  environment: string;

  /**
   * Sanitized snapshot of the HTTP request — headers (redacted), body,
   * query, params, IP, user-agent.
   */
  @Prop({ type: Object, default: null })
  request: RequestSnapshot | null;

  /**
   * createdAt is managed by `timestamps: true`.
   * MongoDB TTL index fires 15 days after this field value.
   *
   * IMPORTANT: The TTL index must be created in MongoDB for auto-deletion
   * to work. @nestjs/mongoose will create it automatically via `syncIndexes`.
   */
  @Prop({
    type: Date,
    default: Date.now,
    expires: FIFTEEN_DAYS_IN_SECONDS, // TTL index → auto-delete after 15 days
  })
  createdAt: Date;
}

export const ErrorLogSchema = SchemaFactory.createForClass(ErrorLog);
