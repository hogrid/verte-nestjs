import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, delay } from 'rxjs/operators';

/**
 * RetryInterceptor
 *
 * Interceptor para retry com backoff exponencial
 * Retenta requisições falhadas com delays crescentes
 */
@Injectable()
export class RetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RetryInterceptor.name);

  constructor(
    private readonly maxRetries: number = 3,
    private readonly baseDelay: number = 1000,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      retry({
        count: this.maxRetries,
        delay: (error, retryCount) => {
          const delayMs = this.calculateBackoff(retryCount);

          this.logger.warn('🔄 Retentando requisição', {
            method,
            url,
            attempt: retryCount,
            maxRetries: this.maxRetries,
            delayMs,
            error: error.message,
          });

          return new Observable<void>((subscriber) => {
            setTimeout(() => {
              subscriber.next(undefined);
              subscriber.complete();
            }, delayMs);
          });
        },
      }),
      catchError((error) => {
        this.logger.error('❌ Todas as tentativas falharam', {
          method,
          url,
          maxRetries: this.maxRetries,
          error: error.message,
        });

        return throwError(() => error);
      }),
    );
  }

  /**
   * Calculate exponential backoff delay
   * Fórmula: baseDelay * (2 ^ (retryCount - 1))
   * Exemplo: 1s, 2s, 4s, 8s, 16s...
   */
  private calculateBackoff(retryCount: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount - 1);
    const maxDelay = 30000; // 30 segundos máximo

    return Math.min(exponentialDelay, maxDelay);
  }
}

/**
 * Custom Retry Options
 */
export interface CustomRetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Create custom retry interceptor with options
 */
export function createRetryInterceptor(
  options: CustomRetryOptions,
): RetryInterceptor {
  return new RetryInterceptor(options.maxRetries, options.baseDelay);
}
