import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';

interface PrismaLikeError {
  name: string;
  code: string;
  meta?: Record<string, unknown>;
}

function isPrismaKnownError(e: unknown): e is PrismaLikeError {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
    typeof (e as { code?: unknown }).code === 'string'
  );
}


@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const o = body as { message?: string | string[]; error?: string };
        message = o.message ?? exception.message;
        error = o.error;
      }
    } else if (isPrismaKnownError(exception)) {
      switch (exception.code) {
        case 'P2002':
          statusCode = HttpStatus.CONFLICT;
          message = 'A record with the same unique value already exists';
          break;
        case 'P2003':
          statusCode = HttpStatus.CONFLICT;
          message =
            'The operation violates a relation: the record is referenced by, or references, another record';
          break;
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        default:
          this.logger.error(`Unhandled database error ${exception.code}`);
      }
    } else {
      this.logger.error(
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception),
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: error ?? STATUS_CODES[statusCode] ?? 'Error',
      path: request.originalUrl ?? request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
