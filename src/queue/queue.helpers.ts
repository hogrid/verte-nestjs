/**
 * Queue Helpers
 *
 * Utilidades para jobs e queues
 */

/**
 * Type guard para verificar se o erro tem stack trace
 */
export function isErrorWithStack(error: unknown): error is Error {
  return error instanceof Error && 'stack' in error;
}

/**
 * Extrair stack trace de um erro desconhecido
 */
export function getErrorStack(error: unknown): string {
  if (isErrorWithStack(error)) {
    return error.stack || error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error);
}

/**
 * Extrair mensagem de um erro desconhecido
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error);
}
