import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * BadRequestToValidationFilter
 *
 * Converts 400 Bad Request errors to 422 Unprocessable Entity
 * for Laravel compatibility.
 *
 * Laravel returns 422 for ALL validation errors, including:
 * - Missing required fields
 * - Invalid data types
 * - Invalid enum values
 *
 * NestJS by default returns:
 * - 400: Malformed request body or missing required fields
 * - 422: Validation rules failed
 *
 * This filter ensures 100% Laravel compatibility by converting
 * all 400 errors from ValidationPipe to 422.
 */
@Catch(BadRequestException)
export class BadRequestToValidationFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const exceptionResponse: any = exception.getResponse();

    // Check if this is a validation error
    const isValidationError =
      exceptionResponse.message &&
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.message.length > 0;

    // If validation error, return 422 instead of 400 (Laravel compatibility)
    if (isValidationError) {
      return response.status(422).json({
        message: exceptionResponse.message,
        error: 'Unprocessable Entity',
        statusCode: 422,
      });
    }

    // If not a validation error, return original 400
    return response.status(400).json(exceptionResponse);
  }
}
