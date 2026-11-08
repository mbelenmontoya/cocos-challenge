import { isAxiosError, isCancel } from 'axios';
import { ZodError } from 'zod';

type ErrorCode = 'network' | 'timeout' | 'http' | 'invalid_response' | 'unknown';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly status?: number,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'AppError';
  }
}

export function normalizeError(error: unknown): Error {
  if (error instanceof AppError || isCancel(error)) return error;
  if (error instanceof ZodError) {
    return new AppError('invalid_response', 'La respuesta del servidor no es válida. Intentá nuevamente.', false, undefined, error);
  }
  if (isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      const message = status === 429
        ? 'Hay demasiadas solicitudes. Intentá nuevamente más tarde.'
        : `No se pudo completar la solicitud (HTTP ${status}).`;
      return new AppError('http', message, [500, 502, 503, 504].includes(status), status, error);
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new AppError('timeout', 'La solicitud tardó demasiado. Intentá nuevamente.', true, undefined, error);
    }
    if (error.code === 'ERR_NETWORK' || error.request) {
      return new AppError('network', 'No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.', true, undefined, error);
    }
  }
  return new AppError('unknown', 'No pudimos completar la solicitud. Intentá nuevamente.', false, undefined, error);
}
