import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { Job } from 'bull';

/**
 * QueueExceptionFilter
 *
 * Exception filter para capturar e tratar erros em jobs de queue
 * Registra logs detalhados e pode disparar alertas
 */
@Catch()
export class QueueExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueueExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    // Get job context if available
    const ctx = host.switchToHttp();
    const job = ctx.getRequest<Job>();

    const errorMessage = exception.message || 'Erro desconhecido';
    const errorStack = exception.stack;

    this.logger.error('❌ Erro capturado em job de queue', {
      jobId: job?.id,
      jobName: job?.name,
      queueName: job?.queue?.name,
      error: errorMessage,
      stack: errorStack,
      attemptsMade: job?.attemptsMade,
      data: job?.data,
    });

    // Re-throw to allow Bull to handle retry logic
    throw exception;
  }
}

/**
 * Helper function to get error details
 */
export function getJobErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as NodeJS.ErrnoException).code,
    };
  }

  return {
    message: String(error),
  };
}
