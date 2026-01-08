import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as {
      message: string | string[];
      error?: string;
    };

    const errors =
      typeof exceptionResponse.message === 'string'
        ? [exceptionResponse.message]
        : exceptionResponse.message;

    response.status(status).json({
      success: false,
      message: 'Erro de validação',
      errors: errors,
      statusCode: status,
    });
  }
}
