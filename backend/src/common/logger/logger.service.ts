import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

@Injectable()
export class AppLogger implements NestLoggerService {
  private readonly logger: Logger;

  constructor(context?: string) {
    this.logger = new Logger(context || 'Application');
  }

  log(message: string, context?: string) {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, context);
  }

  // Structured logging methods
  logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string) {
    this.logger.log(
      `[REQUEST] ${method} ${url} - ${statusCode} - ${duration}ms${userId ? ` - User: ${userId}` : ''}`,
    );
  }

  logError(error: Error, context?: string, metadata?: Record<string, any>) {
    const metadataStr = metadata ? ` - ${JSON.stringify(metadata)}` : '';
    this.logger.error(
      `[ERROR] ${error.message}${metadataStr}`,
      error.stack,
      context,
    );
  }

  logSecurity(event: string, details: Record<string, any>) {
    this.logger.warn(`[SECURITY] ${event} - ${JSON.stringify(details)}`);
  }

  logAdminAction(action: string, adminId: string, targetId?: string, details?: Record<string, any>) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    const targetStr = targetId ? ` - Target: ${targetId}` : '';
    this.logger.log(
      `[ADMIN] ${action} - Admin: ${adminId}${targetStr}${detailsStr}`,
    );
  }
}
