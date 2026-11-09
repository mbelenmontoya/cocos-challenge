import { queryOptions } from '@tanstack/react-query';

import { AppError } from '@/api/errors';
import { env } from '@/config/env';

import { getMarket, searchInstruments } from './api';

const readPolicy = {
  staleTime: 0,
  retry: (failureCount: number, error: Error) => error instanceof AppError && error.retryable && failureCount < 2,
  retryDelay: (attemptIndex: number) => Math.random() * Math.min(1000 * 2 ** attemptIndex, 5000),
};

export const marketQueryOptions = queryOptions({
  ...readPolicy,
  queryKey: ['instruments', env.apiUrl, env.bugs],
  queryFn: ({ signal }) => getMarket(signal),
});

export const searchQueryOptions = (query: string) => queryOptions({
  ...readPolicy,
  queryKey: ['search', env.apiUrl, env.bugs, query],
  queryFn: ({ signal }) => searchInstruments(query, signal),
});
