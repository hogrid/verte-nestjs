import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    let errors: Record<string, string[]> | string[] = [];
    let message = 'Erro de validação';

    // Formato 1: { errors: { field: ['msg'] } } - nosso formato customizado
    if (exceptionResponse.errors && typeof exceptionResponse.errors === 'object') {
      errors = exceptionResponse.errors;
      // Extrair primeira mensagem para exibição principal
      const firstError = Object.values(exceptionResponse.errors).flat()[0];
      if (firstError) {
        message = firstError as string;
      }
    }
    // Formato 2: { message: { errors: { field: ['msg'] } } } - NestJS wrapper
    else if (exceptionResponse.message?.errors && typeof exceptionResponse.message.errors === 'object') {
      errors = exceptionResponse.message.errors;
      const firstError = Object.values(exceptionResponse.message.errors).flat()[0];
      if (firstError) {
        message = firstError as string;
      }
    }
    // Formato 3: { message: ['msg1', 'msg2'] } - class-validator
    else if (Array.isArray(exceptionResponse.message)) {
      errors = exceptionResponse.message;
      message = exceptionResponse.message[0] || message;
    }
    // Formato 4: { message: 'string' } - mensagem simples
    else if (typeof exceptionResponse.message === 'string') {
      errors = [exceptionResponse.message];
      message = exceptionResponse.message;
    }
    // Formato 5: string direta
    else if (typeof exceptionResponse === 'string') {
      errors = [exceptionResponse];
      message = exceptionResponse;
    }

    response.status(status).json({
      success: false,
      message,
      errors,
      statusCode: status,
    });
  }
}
