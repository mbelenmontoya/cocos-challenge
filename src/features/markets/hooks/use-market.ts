import { useFocusedQuery } from '@/hooks/use-focused-query';

import { marketQueryOptions, searchQueryOptions } from '../api/market-query';

export function useMarket(query: string) {
  return useFocusedQuery(query ? searchQueryOptions(query) : marketQueryOptions);
}
