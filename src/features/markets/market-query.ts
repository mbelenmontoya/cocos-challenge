import { queryOptions } from '@tanstack/react-query';

import { AppError } from '@/api/errors';
import { env } from '@/config/env';

import { getMarket } from './api';

export const marketQueryOptions = queryOptions({
  queryKey: ['instruments', env.apiUrl, env.bugs],
  queryFn: ({ signal }) => getMarket(signal),
  staleTime: 0,
  retry: (failureCount, error) => error instanceof AppError && error.retryable && failureCount < 2,
  retryDelay: (attemptIndex) => Math.random() * Math.min(1000 * 2 ** attemptIndex, 5000),
});
