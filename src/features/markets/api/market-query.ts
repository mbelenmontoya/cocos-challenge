import { queryOptions } from '@tanstack/react-query';

import { env } from '@/config/env';
import { readQueryPolicy } from '@/lib/query-policy';

import { getMarket } from './get-market';
import { searchInstruments } from './search-instruments';

export const marketQueryOptions = queryOptions({
  ...readQueryPolicy,
  queryKey: ['instruments', env.apiUrl, env.bugs],
  queryFn: ({ signal }) => getMarket(signal),
});

export const searchQueryOptions = (query: string) => queryOptions({
  ...readQueryPolicy,
  queryKey: ['search', env.apiUrl, env.bugs, query],
  queryFn: ({ signal }) => searchInstruments(query, signal),
});
