import { AppError } from './errors';

/** Retry and freshness policy for read queries. Never apply it to order submissions. */
export const readQueryPolicy = {
  staleTime: 0,
  retry: (failureCount: number, error: Error) => error instanceof AppError && error.retryable && failureCount < 2,
  retryDelay: (attemptIndex: number) => Math.random() * Math.min(1000 * 2 ** attemptIndex, 5000),
};
