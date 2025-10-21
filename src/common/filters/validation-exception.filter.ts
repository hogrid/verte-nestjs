import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Validation Exception Filter
 * Formats validation errors to match Laravel's response format
 * Laravel format: { "errors": { "field": ["message1", "message2"] } }
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    // Transform NestJS validation errors to Laravel format
    const errors: Record<string, string[]> = {};

    if (
      exceptionResponse.message &&
      Array.isArray(exceptionResponse.message)
    ) {
      exceptionResponse.message.forEach((message: string) => {
        // Extract field name from message (e.g., "email must be an email" -> "email")
        const parts = message.split(' ');
        const field = parts[0];

        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(message);
      });
    } else if (typeof exceptionResponse.message === 'string') {
      errors.general = [exceptionResponse.message];
    }

    response.status(status).json({
      errors,
    });
  }
}
