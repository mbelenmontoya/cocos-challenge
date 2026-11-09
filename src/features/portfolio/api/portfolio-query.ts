import { queryOptions } from '@tanstack/react-query';

import { env } from '@/config/env';
import { readQueryPolicy } from '@/lib/query-policy';

import { getPortfolio } from './get-portfolio';

export const portfolioQueryOptions = queryOptions({
  ...readQueryPolicy,
  queryKey: ['portfolio', env.apiUrl, env.bugs, env.candidateId],
  queryFn: ({ signal }) => getPortfolio(signal),
});
