import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const startTime = Date.now();
    const duration = Date.now() - (request['startTime'] || startTime);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;
    let stack: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const errorResponse = res as any;
        message = errorResponse.message || message;
        errors = errorResponse.errors;
        
        // Don't expose stack trace in production
        if (process.env.NODE_ENV !== 'production' && errorResponse.stack) {
          stack = errorResponse.stack;
        }
      }
      
      if (Array.isArray(message)) {
        message = message[0] || 'Validation failed';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      // Only log stack trace in development
      if (process.env.NODE_ENV !== 'production') {
        stack = exception.stack;
      }
      
      // Log full error details for debugging
      this.logger.error(
        `[ERROR] ${request.method} ${request.url} - ${status} - ${message}`,
        exception.stack,
        'ExceptionFilter',
      );
    } else {
      // Unknown error type
      this.logger.error(
        `[UNKNOWN ERROR] ${request.method} ${request.url} - ${status}`,
        JSON.stringify(exception),
        'ExceptionFilter',
      );
    }

    // Log request details for errors
    const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'log';
    const logMessage = `[${request.method}] ${request.url} - ${status} - ${duration}ms - ${message}`;
    
    if (logLevel === 'error') {
      this.logger.error(logMessage, stack, 'ExceptionFilter');
    } else if (logLevel === 'warn') {
      this.logger.warn(logMessage, 'ExceptionFilter');
    } else {
      this.logger.log(logMessage, 'ExceptionFilter');
    }

    // Security: Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    const isInternalError = status >= 500;
    
    const responseBody: any = {
      message: isProduction && isInternalError 
        ? 'An internal server error occurred' 
        : message,
      status,
      statusText:
        status === 400
          ? 'Bad Request'
          : status === 401
            ? 'Unauthorized'
            : status === 403
              ? 'Forbidden'
              : status === 404
                ? 'Not Found'
                : status === 422
                  ? 'Unprocessable Entity'
                  : status === 429
                    ? 'Too Many Requests'
                    : 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include validation errors if present
    if (errors) {
      responseBody.errors = errors;
    }

    // Only include stack trace in development
    if (!isProduction && stack) {
      responseBody.stack = stack;
    }

    response.status(status).json(responseBody);
  }
}
