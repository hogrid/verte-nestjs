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
 * Laravel returns status 422 (Unprocessable Entity) for DTO validation errors
 * Other BadRequest errors (like ParseIntPipe) remain as 400
 * Laravel format: { "message": ["error1", "error2"], "error": "Unprocessable Entity", "statusCode": 422 }
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const exceptionResponse: any = exception.getResponse();

    // Check if this is a DTO validation error (array of messages)
    // vs other BadRequest errors like ParseIntPipe (single message)
    const isValidationError =
      exceptionResponse.message && Array.isArray(exceptionResponse.message);

    // Laravel uses 422 for DTO validation errors, 400 for other bad requests
    const status = isValidationError ? 422 : 400;

    // Extract validation messages
    let messages: string[] = [];

    if (Array.isArray(exceptionResponse.message)) {
      messages = exceptionResponse.message;
    } else if (typeof exceptionResponse.message === 'string') {
      messages = [exceptionResponse.message];
    }

    // Return Laravel-compatible format
    response.status(status).json({
      message: isValidationError ? messages : exceptionResponse.message,
      error: isValidationError ? 'Unprocessable Entity' : 'Bad Request',
      statusCode: status,
    });
  }
}
