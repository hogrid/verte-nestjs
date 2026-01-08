import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class BadRequestToValidationFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as {
      message: string | string[];
      error?: string;
    };

    const messages =
      typeof exceptionResponse.message === 'string'
        ? [exceptionResponse.message]
        : exceptionResponse.message;

    // Transform validation messages to Laravel format
    const errors: Record<string, string[]> = {};
    for (const msg of messages) {
      // Parse field name from message (e.g., "email must be valid" -> "email")
      const match = msg.match(/^(\w+)\s/);
      const field = match ? match[1] : 'general';
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(msg);
    }

    response.status(status).json({
      success: false,
      message: 'Os dados fornecidos são inválidos.',
      errors,
    });
  }
}
