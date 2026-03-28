// instrument.ts MUST be the very first import in main.ts
// We pre-load environment variables here so SENTRY_DSN is available
// before Sentry.init() is called.
import * as dotenv from 'dotenv';
import * as path from 'path';

const env = process.env.NODE_ENV ?? 'development';
const envFile =
  env === 'production'
    ? '.env.production'
    : env === 'test'
      ? '.env.test'
      : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
// Also load base .env as fallback so keys missing from env-specific files still resolve
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: env,
  integrations: [
    nodeProfilingIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
  ],

  // Send structured logs to Sentry
  enableLogs: true,

  // Capture 100% of transactions (lower in production if needed)
  tracesSampleRate: env === 'production' ? 0.2 : 1.0,

  // Profiling: sampled per trace lifecycle
  profileSessionSampleRate: 1.0,
  profileLifecycle: 'trace',

  // Collect default PII (IP address, user info, etc.)
  sendDefaultPii: true,
});
