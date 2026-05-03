/**
 * Centralized logging utility for FOLGA Hub.
 * Can be extended to send logs to external services (Sentry, Logtail, etc.)
 */

type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logObj = { timestamp, level, message, ...meta };
  
  if (process.env.NODE_ENV === 'development') {
    switch (level) {
      case 'info': console.info(`[INFO] ${message}`, meta || ''); break;
      case 'warn': console.warn(`[WARN] ${message}`, meta || ''); break;
      case 'error': console.error(`[ERROR] ${message}`, meta || ''); break;
    }
  } else {
    // In production, we could send this to a logging service
    console.log(JSON.stringify(logObj));
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};
