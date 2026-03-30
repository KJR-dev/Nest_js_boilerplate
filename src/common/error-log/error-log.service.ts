import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorLog, ErrorLogDocument, RequestSnapshot } from './error-log.schema';

export interface CreateErrorLogDto {
  errorId: string;
  sentryEventId: string | null;
  statusCode: number;
  method: string;
  path: string;
  message: string;
  stack: string | null;
  errorName: string | null;
  environment: string;
  /** Sanitized request snapshot (headers redacted, body sanitized). */
  request: RequestSnapshot | null;
}


@Injectable()
export class ErrorLogService {
  constructor(
    @InjectModel(ErrorLog.name)
    private readonly errorLogModel: Model<ErrorLogDocument>,
  ) {}

  /**
   * Persist an error log to MongoDB.
   * Fire-and-forget: errors here must not bubble up into the HTTP response.
   */
  async create(dto: CreateErrorLogDto): Promise<void> {
    try {
      await this.errorLogModel.create(dto);
    } catch (err) {
      // Swallow DB errors — we never want a logging failure to mask the real error
      console.error('[ErrorLogService] Failed to persist error log:', err);
    }
  }

  /** Query error logs by errorId (useful for debugging / admin endpoints). */
  async findByErrorId(errorId: string): Promise<ErrorLogDocument | null> {
    return this.errorLogModel.findOne({ errorId }).exec();
  }

  /** Paginated list of recent error logs for admin dashboards. */
  async findRecent(
    limit = 50,
    skip = 0,
  ): Promise<{ data: ErrorLogDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.errorLogModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.errorLogModel.countDocuments().exec(),
    ]);
    return { data, total };
  }
}
