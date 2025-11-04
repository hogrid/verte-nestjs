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

    // Case 1: Response already has 'errors' field (formatted by exceptionFactory)
    if (exceptionResponse.errors && typeof exceptionResponse.errors === 'object') {
      // Always return 422 for validation errors (Laravel compatibility)
      return response.status(422).json(exceptionResponse);
    }

    // Case 2: Check if this is a validation error (array of messages from ValidationPipe)
    const isValidationError =
      exceptionResponse.message &&
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.message.length > 0;

    if (isValidationError) {
      // Try to extract field names from messages
      // Format: "O campo <field> é obrigatório."
      const errors: Record<string, string[]> = {};

      exceptionResponse.message.forEach((msg: string) => {
        // Try to extract field name from Portuguese messages
        const fieldMatch = msg.match(/campo ([a-z_]+)/i);
        const field = fieldMatch ? fieldMatch[1] : 'general';

        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(msg);
      });

      // Laravel returns 422 for ALL validation errors
      return response.status(422).json({
        errors,
        statusCode: 422,
      });
    }

    // Case 3: Not a validation error - return 400 as-is
    return response.status(400).json(exceptionResponse);
  }
}
