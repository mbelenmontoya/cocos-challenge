import { useFocusedQuery } from '@/hooks/use-focused-query';

import { portfolioQueryOptions } from '../api/portfolio-query';

export function usePortfolio() {
  return useFocusedQuery(portfolioQueryOptions);
}
