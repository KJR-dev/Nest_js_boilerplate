import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const isDev =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        // In development: pretty-print with colors, full stack traces.
        // In production: structured JSON for log aggregators (Datadog, CloudWatch, etc.)
        transport: isDev
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                ignore: 'pid,hostname',
                errorLikeObjectKeys: ['err', 'error'],
              },
            }
          : undefined,

        // Log level: verbose in dev, warn-and-above in prod
        level: isDev ? 'debug' : 'warn',

        // Redact sensitive fields from logs
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
          ],
          censor: '[REDACTED]',
        },

        // Serialize request/response for HTTP logging
        serializers: {
          req(req: { method: string; url: string }) {
            return { method: req.method, url: req.url };
          },
        },

        // Custom log messages for requests/responses
        customSuccessMessage: (req, res) =>
          `${req.method} ${req.url} → ${res.statusCode}`,
        customErrorMessage: (req, res, err) =>
          `${req.method} ${req.url} → ${res.statusCode} | ${err.message}`,
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
